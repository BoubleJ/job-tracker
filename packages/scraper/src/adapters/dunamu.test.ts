import { describe, expect, it } from 'vitest';
import { loadFixture } from '../../test/fixture';
import { parseDunamuJobsPage } from './dunamu';

const PAGE_URL = 'https://www.dunamu.com/careers/jobs';

// fixture: www.dunamu.com/careers/jobs 실측 __NEXT_DATA__ (2026-07, article 13 = 공지 3 + 인재풀 2 + 실공고 8)
describe('parseDunamuJobsPage', () => {
  it('__NEXT_DATA__ articles에서 공지·인재풀을 뺀 공고만 뽑는다', () => {
    const postings = parseDunamuJobsPage(loadFixture('dunamu-jobs.html'), PAGE_URL);

    // 공지(categoryKind NONE) 3건 + talentpool 2건 제외 → 8건
    expect(postings).toHaveLength(8);
    expect(postings[0]).toEqual({
      title: 'Senior Backend Enginner',
      url: 'https://www.dunamu.com/careers/jobs/2005',
    });
  });

  it('공지(NONE)와 talentpool을 제외하고 상세 URL을 origin 기준으로 만든다', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: {
          articles: {
            content: [
              { id: 1, title: '공지', categoryName: 'Notice1', categoryKind: 'NONE' },
              { id: 2, title: '백엔드', categoryName: 'engineering', categoryKind: 'LINK' },
              { id: 3, title: '개발직군 인재풀', categoryName: 'talentpool', categoryKind: 'LINK' },
            ],
          },
        },
      },
    });
    const html = `<script id="__NEXT_DATA__" type="application/json">${payload}</script>`;
    expect(parseDunamuJobsPage(html, PAGE_URL)).toEqual([
      { title: '백엔드', url: 'https://www.dunamu.com/careers/jobs/2' },
    ]);
  });

  it('공고가 하나도 없으면 빈 배열 대신 throw한다', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: {
          articles: {
            content: [
              { id: 1, title: '공지', categoryName: 'Notice1', categoryKind: 'NONE' },
            ],
          },
        },
      },
    });
    const html = `<script id="__NEXT_DATA__" type="application/json">${payload}</script>`;
    expect(() => parseDunamuJobsPage(html, PAGE_URL)).toThrow(/no job articles/);
  });
});
