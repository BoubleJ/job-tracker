import { describe, expect, it } from 'vitest';
import { loadJsonFixture } from '../../test/fixture';
import { parseBanksaladResponse } from './banksalad';

// fixture: www.banksalad.com/proxy/api/greeting/published-openings 실측 응답 일부 (2026-07)
describe('parseBanksaladResponse', () => {
  it('부서별로 묶인 응답을 평탄화해 ScrapeResult로 변환한다', () => {
    const results = parseBanksaladResponse(loadJsonFixture('banksalad-api.json'));

    expect(results).toHaveLength(5); // 고객경험 2건 + 테크 3건
    expect(results[0]).toEqual({
      title: 'CX Operator (인턴십)',
      url: 'https://banksalad.career.greetinghr.com/o/91270',
      description: '고객경험',
    });
  });

  it('공고 url을 그대로 쓴다 (응답이 greeting 상세 절대주소를 준다)', () => {
    const results = parseBanksaladResponse(loadJsonFixture('banksalad-api.json'));

    for (const result of results) {
      expect(result.url).toMatch(
        /^https:\/\/banksalad\.career\.greetinghr\.com\/o\/\d+$/,
      );
    }
  });

  it('dueDate가 null이면 deadline을 넣지 않는다 (상시채용)', () => {
    const results = parseBanksaladResponse(loadJsonFixture('banksalad-api.json'));

    expect(results.every((result) => !('deadline' in result))).toBe(true);
  });

  it('dueDate가 있으면 ISO 날짜로 변환한다', () => {
    const results = parseBanksaladResponse({
      jobs: [
        {
          department: '테크',
          data: [
            {
              title: 'Server Engineer',
              url: 'https://banksalad.career.greetinghr.com/o/1',
              job: '테크',
              dueDate: '2026-08-31T23:59:59',
            },
          ],
        },
      ],
    });

    expect(results[0]?.deadline).toBe('2026-08-31');
  });

  it('스키마에 맞지 않으면 throw한다 (조용한 실패 금지)', () => {
    expect(() => parseBanksaladResponse({ jobs: [{ department: '테크' }] })).toThrow();
    expect(() => parseBanksaladResponse({})).toThrow();
  });
});
