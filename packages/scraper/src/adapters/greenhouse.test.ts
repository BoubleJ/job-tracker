import { describe, expect, it } from 'vitest';
import { loadJsonFixture } from '../../test/fixture';
import { parseGreenhouseResponse } from './greenhouse';

// fixture: boards-api.greenhouse.io/v1/boards/stripe/jobs 실측 응답 일부 (2026-07)
describe('parseGreenhouseResponse', () => {
  it('실측 응답을 ScrapeResult로 변환한다', () => {
    const results = parseGreenhouseResponse(loadJsonFixture('greenhouse.json'));

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      title: 'Account Executive, AI Sales (Grower)',
      url: 'https://stripe.com/jobs/search?gh_jid=7954688',
      description: 'San Francisco, CA', // location.name
      // application_deadline null → deadline 없음
    });
  });

  it('응답 구조가 다르면 ZodError로 즉시 실패한다', () => {
    expect(() => parseGreenhouseResponse([])).toThrow();
    expect(() => parseGreenhouseResponse({ jobs: [{ title: 'no url' }] })).toThrow();
  });

  it('application_deadline이 있으면 ISO 날짜로 변환한다', () => {
    const results = parseGreenhouseResponse({
      jobs: [
        {
          title: 'X',
          absolute_url: 'https://example.com/x',
          application_deadline: '2026-08-01T00:00:00Z',
        },
      ],
    });
    expect(results[0]?.deadline).toBe('2026-08-01');
  });
});
