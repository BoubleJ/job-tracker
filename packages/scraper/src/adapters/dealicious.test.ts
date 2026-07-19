import { describe, expect, it } from 'vitest';
import { loadJsonFixture } from '../../test/fixture';
import { parseDealiciousResponse } from './dealicious';

// fixture: www.dealicious.kr/api/openings?page=0 실측 응답 (2026-07, 공고 1건)
describe('parseDealiciousResponse', () => {
  it('/api/openings 응답에서 공고를 뽑고 greeting 정본 URL을 저장한다', () => {
    const postings = parseDealiciousResponse(
      loadJsonFixture('dealicious-openings.json'),
    );

    expect(postings).toEqual([
      {
        title: '매출회계/정산 담당자',
        // url 필드의 greeting 정본에 https를 붙인다
        url: 'https://dealicious.career.greetinghr.com/o/222787',
        // dueDate(ISO 타임스탬프)에서 날짜만
        deadline: '2026-07-31',
      },
    ]);
  });

  it('activatedAtCareerPage=false는 제외하고 dueDate 없으면 마감일을 넣지 않는다', () => {
    const data = {
      data: {
        totalCount: 2,
        hasNext: false,
        datas: [
          {
            id: 1,
            title: '노출 공고',
            url: 'https://t.career.greetinghr.com/o/1',
            dueDate: null,
            activatedAtCareerPage: true,
          },
          {
            id: 2,
            title: '숨긴 공고',
            url: 'https://t.career.greetinghr.com/o/2',
            dueDate: '2026-08-01T14:59:59Z',
            activatedAtCareerPage: false,
          },
        ],
      },
    };
    expect(parseDealiciousResponse(data)).toEqual([
      { title: '노출 공고', url: 'https://t.career.greetinghr.com/o/1' },
    ]);
  });
});
