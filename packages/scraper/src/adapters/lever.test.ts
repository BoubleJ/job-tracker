import { describe, expect, it } from 'vitest';
import { loadJsonFixture } from '../../test/fixture';
import { parseLeverResponse } from './lever';

// fixture: api.lever.co/v0/postings/mistral?mode=json 실측 응답 일부 (2026-07)
describe('parseLeverResponse', () => {
  it('실측 응답을 ScrapeResult로 변환한다', () => {
    const results = parseLeverResponse(loadJsonFixture('lever.json'));

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      title: 'Account Executive – AI for Citizens',
      url: 'https://jobs.lever.co/mistral/7894fd8a-ffc9-4c89-87f0-f8a7b695cf01',
    });
    // lever는 마감일을 제공하지 않는다
    expect(results[0]?.deadline).toBeUndefined();
    // descriptionPlain이 있으면 description으로 전달
    expect(results[0]?.description).toBeTruthy();
  });

  it('응답 구조가 다르면 ZodError로 즉시 실패한다', () => {
    expect(() => parseLeverResponse({ not: 'an array' })).toThrow();
    expect(() => parseLeverResponse([{ text: 'no hostedUrl' }])).toThrow();
  });
});
