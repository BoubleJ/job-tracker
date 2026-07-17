import { describe, expect, it } from 'vitest';
import { loadFixture } from '../../test/fixture';
import { parseGreetingOpeningDetail, parseGreetingPage } from './greeting';

const PAGE_URL = 'https://oliveyoung.career.greetinghr.com/ko/main';

// fixture: oliveyoung.career.greetinghr.com __NEXT_DATA__ 실측 일부 (2026-07)
describe('parseGreetingPage', () => {
  it('__NEXT_DATA__의 ["openings"] 쿼리에서 공고를 추출한다', () => {
    const results = parseGreetingPage(loadFixture('greeting-page.html'), PAGE_URL);

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      title: 'Backend Engineer (공통영역개선)',
      // 상세 URL 패턴: {origin}/o/{openingId} (실측 200 확인)
      url: 'https://oliveyoung.career.greetinghr.com/o/226419',
      description: 'Back-end Engineering', // workspaceJob.job
    });
    // dueDate null → 상시채용, deadline 없음
    expect(results[0]?.deadline).toBeUndefined();
  });

  it('__NEXT_DATA__가 없으면 throw한다', () => {
    expect(() => parseGreetingPage('<html><body>SPA</body></html>', PAGE_URL)).toThrow(
      /__NEXT_DATA__/,
    );
  });

  it('openings 쿼리가 없으면 throw한다 (구조 변경 감지)', () => {
    const html =
      '<script id="__NEXT_DATA__" type="application/json">' +
      JSON.stringify({
        props: { pageProps: { dehydratedState: { queries: [] } } },
      }) +
      '</script>';
    expect(() => parseGreetingPage(html, PAGE_URL)).toThrow(/openings/);
  });
});

// fixture: soomgo.career.greetinghr.com/ko/o/204087 실측 상세 (2026-07, 본문 앞부분만)
describe('parseGreetingOpeningDetail', () => {
  it('공고 상세에서 제목·상태·본문을 뽑는다', () => {
    const detail = parseGreetingOpeningDetail(loadFixture('greeting-opening.html'));

    expect(detail.title).toBe('Data Scientist');
    expect(detail.status).toBe('OPEN');
    // 실측: 상시채용이라 dueDate가 null이다
    expect(detail.deadline).toBeUndefined();
    expect(detail.description).toBeTruthy();
    expect(detail.description).not.toMatch(/<[a-z]/i);
  });

  it('getOpeningById 쿼리가 없으면(구조 변경) throw한다', () => {
    const html =
      '<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"dehydratedState":{"queries":[]}}}}</script>';
    expect(() => parseGreetingOpeningDetail(html)).toThrow(/getOpeningById/);
  });
});
