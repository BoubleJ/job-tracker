import { describe, expect, it } from 'vitest';
import { loadFixture } from '../../test/fixture';
import { parseAblyRecruitPage } from './ably';

// fixture: ably.team/recruit 실측 __NEXT_DATA__ (2026-07, recruits 54건 = in_progress 53 + closed 1)
describe('parseAblyRecruitPage', () => {
  it('__NEXT_DATA__ recruits에서 in_progress 공고만 뽑는다', () => {
    const postings = parseAblyRecruitPage(loadFixture('ably-recruit.html'));

    // 54건 중 closed 1건을 제외한 53건
    expect(postings).toHaveLength(53);
    expect(postings[0]).toEqual({
      title: '백엔드 엔지니어 (시니어)',
      // 저장용 URL은 ninehire 지원 정본(applyUrl)을 그대로 쓴다
      url: 'https://tydtr0dj.ninehire.site/job_posting/1Ni2VkMj',
    });
  });

  it('closed 공고는 제외하고 deadline이 있으면 ISO 날짜로 넣는다', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: {
          recruits: [
            {
              title: '진행 중',
              applyUrl: 'https://t.ninehire.site/job_posting/AAA',
              status: 'in_progress',
              deadline: '2026-08-01T14:59:59.000Z',
            },
            {
              title: '마감',
              applyUrl: 'https://t.ninehire.site/job_posting/BBB',
              status: 'closed',
              deadline: null,
            },
          ],
        },
      },
    });
    const html = `<script id="__NEXT_DATA__" type="application/json">${payload}</script>`;
    expect(parseAblyRecruitPage(html)).toEqual([
      {
        title: '진행 중',
        url: 'https://t.ninehire.site/job_posting/AAA',
        deadline: '2026-08-01',
      },
    ]);
  });

  it('진행 중 공고가 하나도 없으면 빈 배열 대신 throw한다', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: {
          recruits: [
            {
              title: '마감',
              applyUrl: 'https://t.ninehire.site/job_posting/BBB',
              status: 'closed',
            },
          ],
        },
      },
    });
    const html = `<script id="__NEXT_DATA__" type="application/json">${payload}</script>`;
    expect(() => parseAblyRecruitPage(html)).toThrow(/no in_progress recruits/);
  });
});
