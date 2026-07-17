import { describe, expect, it } from 'vitest';
import { loadJsonFixture } from '../../test/fixture';
import {
  parseKakaobankDetailResponse,
  parseKakaobankListResponse,
} from './kakaobank';

// fixture: recruit.kakaobank.com POST /api/recruits 실측 응답 일부 (2026-07)
// 4건의 receiveEndDatetime: 07-17, 07-29, 07-24, 08-06
describe('parseKakaobankListResponse', () => {
  it('실측 응답을 ScrapeResult로 변환한다', () => {
    const results = parseKakaobankListResponse(
      loadJsonFixture('kakaobank-list.json'),
      new Date('2026-07-01T00:00:00'),
    );

    expect(results).toHaveLength(4);
    expect(results[0]).toEqual({
      title: '시장리스크 시스템 개발자 (계약직)',
      url: 'https://recruit.kakaobank.com/jobs/258193',
      deadline: '2026-07-17',
    });
  });

  it('접수 마감이 지난 공고는 제외한다 — API가 마감 공고까지 전부 내려준다', () => {
    const results = parseKakaobankListResponse(
      loadJsonFixture('kakaobank-list.json'),
      new Date('2026-07-25T00:00:00'),
    );

    // 07-17·07-24 마감은 빠지고 07-29·08-06만 남는다
    expect(results.map((r) => r.deadline)).toEqual(['2026-07-29', '2026-08-06']);
  });

  it('마감 당일은 접수 중으로 본다 (마감 시각 23:59:59)', () => {
    const results = parseKakaobankListResponse(
      loadJsonFixture('kakaobank-list.json'),
      new Date('2026-07-17T09:00:00'),
    );
    expect(results.map((r) => r.deadline)).toContain('2026-07-17');
  });

  it('응답 구조가 다르면 ZodError로 즉시 실패한다', () => {
    expect(() => parseKakaobankListResponse({ list: [] }, new Date())).toThrow();
    expect(() =>
      parseKakaobankListResponse(
        { paging: { totalPages: 1 }, list: [{ recruitNoticeSn: 1 }] },
        new Date(),
      ),
    ).toThrow();
  });
});

// fixture: recruit.kakaobank.com GET /api/recruits/258193 실측 응답 (2026-07, contents 앞부분만)
describe('parseKakaobankDetailResponse', () => {
  it('contents HTML을 평문 본문으로 바꾼다', () => {
    const description = parseKakaobankDetailResponse(
      loadJsonFixture('kakaobank-detail.json'),
    );

    expect(description).toBeTruthy();
    expect(description).not.toMatch(/<[a-z]/i);
    expect(description).not.toContain('&nbsp;');
  });

  it('contents가 없으면 undefined를 반환한다', () => {
    expect(parseKakaobankDetailResponse({})).toBeUndefined();
    expect(parseKakaobankDetailResponse({ contents: null })).toBeUndefined();
  });
});
