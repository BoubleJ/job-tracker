import { describe, expect, it } from 'vitest';
import { loadFixture } from '../../test/fixture';
import { parseSoomgoCareerPage } from './soomgo';

// fixture: www.soomgo.team/career 실측 RSC 페이로드의 공고 3건 (2026-07)
describe('parseSoomgoCareerPage', () => {
  it('RSC 플라이트 페이로드에서 공고 목록을 뽑는다', () => {
    const postings = parseSoomgoCareerPage(loadFixture('soomgo-career.html'));

    expect(postings).toHaveLength(3);
    expect(postings[0]).toEqual({
      openingId: '213087',
      title: 'CEO Staff',
      // 페이로드의 url은 스킴이 없다 — greeting 어댑터와 같은 {origin}/o/{id}로 만든다
      url: 'https://soomgo.career.greetinghr.com/o/213087',
    });
    expect(postings.map((p) => p.title)).toContain('Data Scientist');
  });

  it('페이지가 밝힌 공고 수와 다르면 throw한다 — 마크업 변경을 조용히 넘기지 않는다', () => {
    const html = loadFixture('soomgo-career.html').replace(
      '3개의 채용 공고가 있습니다',
      '9개의 채용 공고가 있습니다',
    );
    expect(() => parseSoomgoCareerPage(html)).toThrow(/page says 9 .* parsed 3/);
  });

  it('공고가 하나도 없으면 빈 배열 대신 throw한다', () => {
    expect(() => parseSoomgoCareerPage('<html><body>없음</body></html>')).toThrow(
      /no postings found/,
    );
  });

  it('이스케이프된 제목을 복원한다', () => {
    const html = `<script>self.__next_f.push([1,${JSON.stringify(
      '[{"posting":{"id":1,"title":"CX \\"Lead\\" (계약직)","url":"x/o/1"}}]',
    )}])</script>`;
    expect(parseSoomgoCareerPage(html)[0]?.title).toBe('CX "Lead" (계약직)');
  });
});
