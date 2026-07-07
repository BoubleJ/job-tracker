import { describe, expect, it } from 'vitest';
import { loadFixture } from '../../test/fixture';
import { parseGreetingPage } from './greeting';

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
