import { z } from 'zod';

/**
 * OpenAI 호환 LLM 클라이언트 (스펙 9장).
 *
 * - 코드가 특정 업체를 알지 못하도록 base URL·API 키·모델명은 전부 env 주입
 * - Structured Outputs: Zod 스키마 → z.toJSONSchema()로 json_schema 요청 구성,
 *   응답은 동일한 Zod 스키마로 파싱 (스키마 단일 소스)
 * - 429(rate limit): 지수 백오프 재시도 (Retry-After 헤더가 있으면 우선).
 *   단 Retry-After가 60초를 넘으면(일일 한도 소진 등) 기다려도 소용없으므로 즉시 실패 —
 *   cron 워커가 타임아웃까지 대기만 하다 취소되는 것을 막는다 (호출부는 다음 실행에서 재시도)
 * - 429는 LlmRateLimitError로 던지며 exhausted 플래그로 두 종류를 구분한다.
 *   Groq 기준 분당 토큰(TPM) 초과는 몇 초 뒤 풀리지만 일일 토큰(TPD) 초과는 그렇지 않은데,
 *   둘 다 상태코드가 429라 호출부가 메시지로는 구별할 수 없다 (스로틀 vs 소진).
 * - 파싱 실패(비JSON/스키마 불일치): 새 completion으로 1회 재시도 후 에러
 */

/**
 * 429 전용 에러.
 * exhausted=true  — 한도 소진(Retry-After가 임계를 초과). 이번 실행에서 재시도해도 무의미.
 * exhausted=false — 일시적 스로틀. 재시도 예산을 다 썼을 뿐이며 곧 풀린다.
 */
export class LlmRateLimitError extends Error {
  readonly exhausted: boolean;
  readonly retryAfterSec: number | null;

  constructor(message: string, exhausted: boolean, retryAfterSec: number | null) {
    super(message);
    this.name = 'LlmRateLimitError';
    this.exhausted = exhausted;
    this.retryAfterSec = retryAfterSec;
  }
}

export interface LlmEnv {
  baseUrl: string;
  apiKey: string;
  modelFilter: string;
  modelExtract: string;
}

/** LLM_* env를 검증해 로드한다. 누락 시 어떤 변수가 없는지 명시하고 throw. */
export function loadLlmEnv(
  env: Record<string, string | undefined> = process.env,
): LlmEnv {
  const missing: string[] = [];
  const read = (key: string): string => {
    const value = env[key];
    if (!value) missing.push(key);
    return value ?? '';
  };
  const result: LlmEnv = {
    baseUrl: read('LLM_BASE_URL'),
    apiKey: read('LLM_API_KEY'),
    modelFilter: read('LLM_MODEL_FILTER'),
    modelExtract: read('LLM_MODEL_EXTRACT'),
  };
  if (missing.length > 0) {
    throw new Error(`Missing LLM env vars: ${missing.join(', ')}`);
  }
  return result;
}

const chatCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullish() }),
      }),
    )
    .min(1),
});

export interface CompleteStructuredOptions<T> {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** 응답을 검증할 Zod 스키마 — json_schema 요청 생성에도 사용된다 */
  schema: z.ZodType<T>;
  /** json_schema.name (영숫자/언더스코어) */
  schemaName: string;
  temperature?: number;
  /** 기본값: env LLM_BASE_URL */
  baseUrl?: string;
  /** 기본값: env LLM_API_KEY */
  apiKey?: string;
  /** 429 백오프 재시도 횟수 (기본 3) */
  maxRateLimitRetries?: number;
  /** 백오프 기본 지연 ms (기본 1000; attempt마다 2배) */
  baseDelayMs?: number;
  /** 429 백오프로 잘 수 있는 총 시간 상한 ms (기본 60000) */
  maxTotalBackoffMs?: number;
  /** 테스트용 fetch 주입 */
  fetchImpl?: typeof fetch;
}

/** Structured Outputs로 chat completion을 호출하고 Zod로 파싱된 결과를 반환한다. */
export async function completeStructured<T>(
  options: CompleteStructuredOptions<T>,
): Promise<T> {
  const baseUrl = options.baseUrl ?? process.env.LLM_BASE_URL;
  const apiKey = options.apiKey ?? process.env.LLM_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('LLM_BASE_URL and LLM_API_KEY must be set (env or options)');
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = JSON.stringify({
    model: options.model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    ...(options.temperature !== undefined && { temperature: options.temperature }),
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: options.schemaName,
        schema: z.toJSONSchema(options.schema),
      },
    },
  });

  let lastError: unknown;
  // 파싱 실패 시 새 completion으로 1회 재시도 (총 2회)
  for (let parseAttempt = 0; parseAttempt < 2; parseAttempt++) {
    const content = await requestCompletion({
      fetchImpl,
      url,
      apiKey,
      body,
      maxRetries: options.maxRateLimitRetries ?? 3,
      baseDelayMs: options.baseDelayMs ?? 1000,
      maxTotalBackoffMs: options.maxTotalBackoffMs ?? DEFAULT_MAX_TOTAL_BACKOFF_MS,
    });
    try {
      return options.schema.parse(JSON.parse(content));
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `LLM structured output parsing failed after retry (schema: ${options.schemaName}): ${String(lastError)}`,
  );
}

/** 이보다 긴 Retry-After는 일일 한도류 소진으로 보고 재시도하지 않는다 */
const MAX_RETRY_AFTER_SEC = 60;

/** 한 요청이 429 백오프로 잘 수 있는 총 시간 상한 (재시도 횟수와 별개의 예산) */
const DEFAULT_MAX_TOTAL_BACKOFF_MS = 60_000;

async function requestCompletion(args: {
  fetchImpl: typeof fetch;
  url: string;
  apiKey: string;
  body: string;
  maxRetries: number;
  baseDelayMs: number;
  maxTotalBackoffMs: number;
}): Promise<string> {
  const { fetchImpl, url, apiKey, body, maxRetries, baseDelayMs, maxTotalBackoffMs } =
    args;
  let sleptMs = 0;
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body,
    });
    if (res.status === 429) {
      const header = Number(res.headers.get('retry-after'));
      const retryAfterSec = Number.isFinite(header) && header > 0 ? header : null;
      const detail = await res.text().catch(() => '');
      if (retryAfterSec !== null && retryAfterSec > MAX_RETRY_AFTER_SEC) {
        throw new LlmRateLimitError(
          `LLM request failed: 429 (retry-after ${retryAfterSec}s exceeds ${MAX_RETRY_AFTER_SEC}s, giving up) ${detail.slice(0, 500)}`,
          true,
          retryAfterSec,
        );
      }
      const delayMs =
        retryAfterSec !== null ? retryAfterSec * 1000 : baseDelayMs * 2 ** attempt;
      if (attempt >= maxRetries || sleptMs + delayMs > maxTotalBackoffMs) {
        throw new LlmRateLimitError(
          `LLM request failed: 429 (throttled; gave up after ${attempt + 1} attempts, waited ${sleptMs}ms) ${detail.slice(0, 500)}`,
          false,
          retryAfterSec,
        );
      }
      await sleep(delayMs);
      sleptMs += delayMs;
      continue;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`LLM request failed: ${res.status} ${detail.slice(0, 500)}`);
    }
    const parsed = chatCompletionResponseSchema.parse(await res.json());
    return parsed.choices[0]?.message.content ?? '';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
