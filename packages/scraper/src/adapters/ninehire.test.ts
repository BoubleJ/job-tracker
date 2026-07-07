import { describe, expect, it } from 'vitest';
import { loadFixture, loadJsonFixture } from '../../test/fixture';
import { extractNinehireCompanyId, parseNinehireResponse } from './ninehire';

const PAGE_URL = 'https://rapportlabs.kr/jobs';

// fixture: rapportlabs.kr/jobs(커스텀 도메인 + 나인하이어) 실측 (2026-07, 스펙 7-3 지정 샘플)
describe('extractNinehireCompanyId', () => {
  it('__NEXT_DATA__에서 companyId를 추출한다', () => {
    expect(extractNinehireCompanyId(loadFixture('ninehire-page.html'))).toBe(
      '4e1cfd70-6de0-11f0-9567-477c783608ca',
    );
  });

  it('__NEXT_DATA__가 없으면 throw한다', () => {
    expect(() => extractNinehireCompanyId('<html></html>')).toThrow(/__NEXT_DATA__/);
  });
});

// fixture: api.ninehire.com/identity-access/homepage/recruitments 실측 응답 일부
describe('parseNinehireResponse', () => {
  it('실측 응답을 ScrapeResult로 변환한다', () => {
    const results = parseNinehireResponse(loadJsonFixture('ninehire-api.json'), PAGE_URL);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      title: 'Senior Recruiter',
      // 상세 URL 패턴: {origin}/job_posting/{addressKey} (실측 200 확인)
      url: 'https://rapportlabs.kr/job_posting/Iuq4YeKr',
    });
    // deadlineValue(KST 자정 = 14:59:59Z)에서 날짜만 취한다
    expect(results[1]).toEqual({
      title: 'SNS 콘텐츠 마케팅 인턴',
      url: 'https://rapportlabs.kr/job_posting/Ti0Xg5X8',
      deadline: '2026-07-05',
    });
  });

  it('in_progress가 아닌 공고는 제외한다', () => {
    const results = parseNinehireResponse(
      {
        count: 1,
        results: [
          {
            recruitmentId: 'r1',
            title: '마감된 공고',
            externalTitle: null,
            addressKey: 'abc',
            deadlineValue: null,
            status: 'ended',
          },
        ],
      },
      PAGE_URL,
    );
    expect(results).toHaveLength(0);
  });

  it('응답 구조가 다르면 ZodError로 즉시 실패한다', () => {
    expect(() => parseNinehireResponse({ results: 'nope' }, PAGE_URL)).toThrow();
  });
});
