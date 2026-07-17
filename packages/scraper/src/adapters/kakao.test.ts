import { describe, expect, it } from 'vitest';
import { loadJsonFixture } from '../../test/fixture';
import { parseKakaoDetailResponse, parseKakaoListResponse } from './kakao';

// fixture: careers.kakao.com/public/api/job-list?part=TECHNOLOGY 실측 응답 일부 (2026-07)
describe('parseKakaoListResponse', () => {
  it('실측 응답을 ScrapeResult로 변환한다', () => {
    const results = parseKakaoListResponse(
      loadJsonFixture('kakao-list.json'),
      'https://careers.kakao.com',
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: 'AI Platform 추론 최적화 Engineer(경력)',
      url: 'https://careers.kakao.com/jobs/P-14469',
    });
    // 실측: 카카오 공고는 상시채용이라 endDate가 null이다
    expect(results[0]?.deadline).toBeUndefined();
  });

  it('closeFlag가 켜진 마감 공고는 제외한다', () => {
    const data = {
      totalPage: 1,
      jobList: [
        { realId: 'P-1', jobOfferTitle: '열림', closeFlag: false, endDate: null },
        { realId: 'P-2', jobOfferTitle: '마감', closeFlag: true, endDate: null },
      ],
    };
    const results = parseKakaoListResponse(data, 'https://careers.kakao.com');
    expect(results.map((r) => r.title)).toEqual(['열림']);
  });

  it('endDate가 있으면 ISO 날짜만 취한다', () => {
    const data = {
      totalPage: 1,
      jobList: [
        { realId: 'P-1', jobOfferTitle: 'x', closeFlag: false, endDate: '2026-08-01T23:59:59' },
      ],
    };
    expect(parseKakaoListResponse(data, 'https://x.com')[0]?.deadline).toBe('2026-08-01');
  });

  it('응답 구조가 다르면 ZodError로 즉시 실패한다', () => {
    expect(() => parseKakaoListResponse({ jobList: [] }, 'https://x.com')).toThrow();
    expect(() =>
      parseKakaoListResponse({ totalPage: 1, jobList: [{ realId: 1 }] }, 'https://x.com'),
    ).toThrow();
  });
});

// fixture: careers.kakao.com/public/api/job-detail?id=P-14469 실측 응답 (2026-07, 섹션별 앞부분만)
describe('parseKakaoDetailResponse', () => {
  it('섹션을 라벨과 함께 합쳐 평문 본문을 만든다', () => {
    const description = parseKakaoDetailResponse(loadJsonFixture('kakao-detail.json'));

    expect(description).toBeTruthy();
    expect(description).toContain('[소개]');
    expect(description).toContain('[업무 내용]');
    expect(description).toContain('[지원 자격]');
    expect(description).not.toMatch(/<[a-z]/i);
  });

  it('본문 필드가 모두 비면 undefined를 반환한다', () => {
    expect(parseKakaoDetailResponse({})).toBeUndefined();
    expect(parseKakaoDetailResponse({ introduction: null })).toBeUndefined();
  });
});
