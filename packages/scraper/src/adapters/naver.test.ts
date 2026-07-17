import { describe, expect, it } from 'vitest';
import { loadFixture, loadJsonFixture } from '../../test/fixture';
import { extractNaverDescription, parseNaverResponse } from './naver';

// fixture: recruit.navercorp.com/rcrt/loadJobList.do 실측 응답 일부 (2026-07)
describe('parseNaverResponse', () => {
  it('실측 응답을 ScrapeResult로 변환한다', () => {
    const results = parseNaverResponse(
      loadJsonFixture('naver-api.json'),
      'https://recruit.navercorp.com',
    );

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      title: '[NAVER] Efficient World Model Research (체험형 인턴)',
      url: 'https://recruit.navercorp.com/rcrt/view.do?annoId=30005100&lang=ko',
      deadline: '2026-07-20',
    });
  });

  it('origin으로 계열사(스노우 등) 상세 URL을 만든다', () => {
    const results = parseNaverResponse(
      loadJsonFixture('naver-api.json'),
      'https://recruit.snowcorp.com',
    );
    expect(results[0]?.url).toBe(
      'https://recruit.snowcorp.com/rcrt/view.do?annoId=30005100&lang=ko',
    );
  });

  it('endYmd를 ISO 날짜로 바꾸고, 상시채용 sentinel(2999)은 마감일 없음으로 본다', () => {
    const asList = (endYmd: string | null) => ({
      list: [{ annoId: 1, annoSubject: 'x', endYmd }],
    });
    const at = (endYmd: string | null) =>
      parseNaverResponse(asList(endYmd), 'https://x.com')[0]?.deadline;

    expect(at('20260720')).toBe('2026-07-20');
    // 실측: KREAM 공고가 29991231로 상시채용을 표현한다
    expect(at('29991231')).toBeUndefined();
    expect(at(null)).toBeUndefined();
    expect(at('2026-07-20')).toBeUndefined();
  });

  it('응답 구조가 다르면 ZodError로 즉시 실패한다', () => {
    expect(() => parseNaverResponse({ nope: [] }, 'https://x.com')).toThrow();
    expect(() =>
      parseNaverResponse({ list: [{ annoId: 'not-a-number' }] }, 'https://x.com'),
    ).toThrow();
  });
});

// fixture: recruit.navercorp.com/rcrt/view.do 실측 HTML의 본문 구간 (2026-07)
describe('extractNaverDescription', () => {
  it('detail_wrap 구간만 평문으로 뽑는다', () => {
    const description = extractNaverDescription(loadFixture('naver-view.html'));

    expect(description).toBeTruthy();
    // 본문 앞뒤의 네비게이션·푸터는 들어가지 않는다
    expect(description).not.toContain('NAVER Corp.');
    expect(description).not.toContain('홈 채용');
    // 태그는 남지 않는다
    expect(description).not.toMatch(/<[a-z]/i);
  });

  it('detail_wrap이 없으면(구조 변경) undefined를 반환한다', () => {
    expect(extractNaverDescription('<html><body>공고 없음</body></html>')).toBeUndefined();
  });
});
