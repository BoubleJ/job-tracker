import { describe, expect, it } from 'vitest';
import { loadFixture } from '../../test/fixture';
import { parseSocarCareerPage } from './socar';

// fixture: www.socarcorp.kr/careers/jobs 실측 __NEXT_DATA__ (2026-07, 쏘카+나인투원, 중복 1건 포함 26행)
describe('parseSocarCareerPage', () => {
  it('__NEXT_DATA__ jobList에서 greeting 공고 목록을 뽑는다 (중복 제거)', () => {
    const postings = parseSocarCareerPage(loadFixture('socar-careers.html'));

    // 26행 중 openingId 중복 1건을 제거해 25건
    expect(postings).toHaveLength(25);
    expect(postings[0]).toEqual({
      openingId: '223732',
      title: 'B2B 시승 사업개발 시니어 매니저',
      // 저장용 정본 URL은 greeting 어댑터와 같은 {origin}/o/{id}
      url: 'https://socar.career.greetinghr.com/o/223732',
    });
    // 모든 URL이 greeting 상세 정본 형태
    for (const p of postings) {
      expect(p.url).toMatch(/^https:\/\/socar\.career\.greetinghr\.com\/o\/\d+$/);
    }
  });

  it('greeting(/o/{id})이 아닌 링크는 건너뛰고 나머지만 남긴다', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: {
          jobList: {
            jsonResult: {
              data: [
                { title: '그리팅 공고', notice_url: 'https://socar.career.greetinghr.com/ko/o/111' },
                { title: '외부 링크', notice_url: 'https://www.socarcorp.kr/careers/external/xyz' },
                { title: '스킴 없는 값', notice_url: 'not-a-url' },
              ],
            },
          },
        },
      },
    });
    const html = `<script id="__NEXT_DATA__" type="application/json">${payload}</script>`;
    const postings = parseSocarCareerPage(html);
    expect(postings).toEqual([
      { openingId: '111', title: '그리팅 공고', url: 'https://socar.career.greetinghr.com/o/111' },
    ]);
  });

  it('openingId가 같은 중복 공고는 하나만 남긴다', () => {
    const payload = JSON.stringify({
      props: {
        pageProps: {
          jobList: {
            jsonResult: {
              data: [
                { title: '공고 A', notice_url: 'https://socar.career.greetinghr.com/ko/o/222' },
                { title: '공고 A (중복)', notice_url: 'https://socar.career.greetinghr.com/o/222' },
              ],
            },
          },
        },
      },
    });
    const html = `<script id="__NEXT_DATA__" type="application/json">${payload}</script>`;
    const postings = parseSocarCareerPage(html);
    expect(postings).toHaveLength(1);
    expect(postings[0]?.openingId).toBe('222');
  });

  it('greeting 공고가 하나도 없으면 빈 배열 대신 throw한다', () => {
    const empty = JSON.stringify({
      props: { pageProps: { jobList: { jsonResult: { data: [] } } } },
    });
    const html = `<script id="__NEXT_DATA__" type="application/json">${empty}</script>`;
    expect(() => parseSocarCareerPage(html)).toThrow(/no greeting postings found/);
  });
});
