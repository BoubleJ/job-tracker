import { z } from 'zod';
import {
  applyPolicySchema,
  completeStructured,
  loadLlmEnv,
  preprocessHtml,
} from '@job-tracker/shared';
import { fetchText } from './fetch';
import { renderWithBrowser } from './browser';

/**
 * 지원 정책 추출기 (스펙 7-6) — 재지원/중복지원 가능 여부를 페이지 텍스트에서 추출한다.
 * 공고 스크래핑과 별도 모듈: 실행 주기가 다르다 (회사 등록 시 1회 + 수동 재실행, cron 제외).
 *
 * 최악의 실패 모드는 "페이지에 없는 정책을 추측으로 만들어내는 것"이므로,
 * 관련 안내가 없으면 unknown을 강제하고 note/sourceQuote로 근거를 검증 가능하게 한다.
 */

// Groq strict 모드 미사용이므로 전 필드 필수 + nullable로 설계
export const policyExtractionSchema = z.object({
  reapplyPolicy: applyPolicySchema,
  duplicateApplyPolicy: applyPolicySchema,
  /** 판단 요약 (한국어 한 줄). 안내가 없으면 null */
  note: z.string().nullable(),
  /** 판단 근거가 된 페이지 원문 문구 그대로. 안내가 없으면 null */
  sourceQuote: z.string().nullable(),
});
export type PolicyExtraction = z.infer<typeof policyExtractionSchema>;

const MAX_TEXT_CHARS = 24_000;

const SYSTEM_PROMPT = [
  '너는 회사 채용페이지 텍스트에서 지원 정책을 추출하는 도구다. 두 가지를 판정한다:',
  '- reapplyPolicy: 재지원(불합격 후 다시 지원) 가능 여부',
  '- duplicateApplyPolicy: 중복지원(동시에 복수 포지션 지원) 가능 여부',
  '',
  '각 값은 allowed | not_allowed | conditional | unknown 중 하나다.',
  '규칙:',
  '- 페이지에 해당 정책에 대한 명시적 안내 문구가 있을 때만 allowed/not_allowed/conditional로 답한다.',
  '- 안내가 전혀 없으면 반드시 unknown으로 답한다. 절대 추측하거나 일반 상식으로 채우지 마라.',
  '- "가능하지만 6개월 후 권장" 같은 조건부 안내는 conditional로 분류한다.',
  '- sourceQuote에는 판단 근거가 된 원문 문구를 페이지 텍스트에서 글자 그대로 복사한다.',
  '  근거 문구가 없으면(둘 다 unknown이면) sourceQuote와 note는 null.',
  '- note에는 뉘앙스를 담은 한국어 한 줄 요약을 적는다 (예: "재지원은 불합격 6개월 이후 가능").',
].join('\n');

export interface ExtractApplyPolicyOptions {
  /** 정책 안내가 적힌 페이지 URL (careers_url 또는 scrape_config.policyUrl) */
  url: string;
  /** CSR 페이지면 Playwright로 렌더링 */
  needsBrowser?: boolean;
  /** 테스트용 fetch 주입 */
  fetchImpl?: typeof fetch;
}

export interface ApplyPolicyResult extends PolicyExtraction {
  /** 추출에 사용한 페이지 URL — companies.policy_source_url에 기록 */
  sourceUrl: string;
}

export async function extractApplyPolicy(
  input: string | ExtractApplyPolicyOptions,
): Promise<ApplyPolicyResult> {
  const options = typeof input === 'string' ? { url: input } : input;
  const llmEnv = loadLlmEnv();
  const html = options.needsBrowser
    ? await renderWithBrowser(options.url)
    : await fetchText(options.url, options.fetchImpl);
  const page = preprocessHtml(html);

  const extraction = await completeStructured({
    model: llmEnv.modelExtract,
    baseUrl: llmEnv.baseUrl,
    apiKey: llmEnv.apiKey,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `## 채용페이지 텍스트\n${page.text.slice(0, MAX_TEXT_CHARS)}`,
    schema: policyExtractionSchema,
    schemaName: 'apply_policy_extraction',
    temperature: 0,
  });

  return { ...extraction, sourceUrl: options.url };
}
