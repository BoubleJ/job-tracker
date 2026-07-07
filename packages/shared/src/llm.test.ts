import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { completeStructured, loadLlmEnv } from './llm';

const resultSchema = z.object({ company: z.string(), confidence: z.number() });

function chatResponse(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status },
  );
}

const baseOptions = {
  model: 'test-model',
  systemPrompt: 'system',
  userPrompt: 'user',
  schema: resultSchema,
  schemaName: 'test_result',
  baseUrl: 'https://llm.test/v1',
  apiKey: 'key',
  baseDelayMs: 1,
} as const;

describe('completeStructured', () => {
  it('Structured Outputs 요청을 구성하고 응답을 Zod로 파싱한다', async () => {
    const fetchImpl = vi.fn(async () =>
      chatResponse(JSON.stringify({ company: 'kakao', confidence: 0.9 })),
    );
    const result = await completeStructured({ ...baseOptions, fetchImpl });
    expect(result).toEqual({ company: 'kakao', confidence: 0.9 });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://llm.test/v1/chat/completions');
    expect(init.headers).toMatchObject({ authorization: 'Bearer key' });
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('test-model');
    expect(body.messages).toEqual([
      { role: 'system', content: 'system' },
      { role: 'user', content: 'user' },
    ]);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.name).toBe('test_result');
    expect(body.response_format.json_schema.schema.type).toBe('object');
    expect(body.response_format.json_schema.schema.properties).toHaveProperty('company');
  });

  it('429 응답이면 지수 백오프 후 재시도한다', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(
        chatResponse(JSON.stringify({ company: 'toss', confidence: 0.8 })),
      );
    const result = await completeStructured({ ...baseOptions, fetchImpl });
    expect(result).toEqual({ company: 'toss', confidence: 0.8 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('429 재시도를 소진하면 throw한다', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('rate limited', { status: 429 }));
    await expect(
      completeStructured({ ...baseOptions, fetchImpl, maxRateLimitRetries: 2 }),
    ).rejects.toThrow(/429/);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 최초 1회 + 재시도 2회
  });

  it('파싱 실패 시 새 completion으로 1회 재시도한다', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(chatResponse('not-json'))
      .mockResolvedValueOnce(
        chatResponse(JSON.stringify({ company: 'naver', confidence: 1 })),
      );
    const result = await completeStructured({ ...baseOptions, fetchImpl });
    expect(result).toEqual({ company: 'naver', confidence: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('재시도 후에도 파싱에 실패하면 throw한다', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => chatResponse(JSON.stringify({ wrong: 'shape' })));
    await expect(completeStructured({ ...baseOptions, fetchImpl })).rejects.toThrow(
      /parsing failed after retry/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('429가 아닌 HTTP 에러는 즉시 throw한다', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('boom', { status: 500 }));
    await expect(completeStructured({ ...baseOptions, fetchImpl })).rejects.toThrow(
      /500/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('loadLlmEnv', () => {
  it('네 개의 env를 모두 읽는다', () => {
    expect(
      loadLlmEnv({
        LLM_BASE_URL: 'https://api.groq.com/openai/v1',
        LLM_API_KEY: 'k',
        LLM_MODEL_FILTER: 'openai/gpt-oss-20b',
        LLM_MODEL_EXTRACT: 'openai/gpt-oss-120b',
      }),
    ).toEqual({
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'k',
      modelFilter: 'openai/gpt-oss-20b',
      modelExtract: 'openai/gpt-oss-120b',
    });
  });

  it('누락된 변수 이름을 에러 메시지에 담아 throw한다', () => {
    expect(() => loadLlmEnv({ LLM_BASE_URL: 'https://x' })).toThrow(
      /LLM_API_KEY.*LLM_MODEL_FILTER.*LLM_MODEL_EXTRACT/,
    );
  });
});
