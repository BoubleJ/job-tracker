import { describe, expect, it } from 'vitest';
import { loadFixture } from '../../test/fixture';
import {
  extractSoopDescription,
  parseSoopDeadline,
  parseSoopList,
} from './soop';

// fixture: recruit.sooplive.com/recruit_list.php 실측 HTML의 카드 3개 (2026-07)
describe('parseSoopList', () => {
  it('실측 목록 HTML을 ScrapeResult로 변환한다', () => {
    const results = parseSoopList(loadFixture('soop-list.html'));

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      title: 'AI Serving Engineer',
      url: 'https://recruit.sooplive.com/recruit_list_sub.php?division=ALWAYS&sub_idx=2194&e_idx=112',
    });
    expect(results.map((r) => r.title)).toContain('AI 모델 개발');
    // 실측 전 공고가 "채용완료시"(상시)라 마감일이 없다
    expect(results[0]?.deadline).toBeUndefined();
  });

  it('공고가 하나도 없으면(마크업 변경) 빈 배열 대신 throw한다', () => {
    expect(() => parseSoopList('<html><body>공고 없음</body></html>')).toThrow(
      /no job cards/,
    );
  });

  it('카드에 제목이 없으면 throw한다', () => {
    const html =
      '<li><a href="https://recruit.sooplive.com/recruit_list_sub.php?sub_idx=1"><div class="title"></div></a></li>';
    expect(() => parseSoopList(html)).toThrow(/without title/);
  });
});

describe('parseSoopDeadline', () => {
  it('날짜 형태만 ISO로 바꾸고 상시채용 표현은 마감일 없음으로 본다', () => {
    expect(parseSoopDeadline('2026.07.31')).toBe('2026-07-31');
    expect(parseSoopDeadline('2026-07-31')).toBe('2026-07-31');
    // 실측값
    expect(parseSoopDeadline('채용완료시')).toBeUndefined();
    expect(parseSoopDeadline(undefined)).toBeUndefined();
    expect(parseSoopDeadline('상시채용')).toBeUndefined();
  });
});

// fixture: recruit_list_sub.php 실측 HTML의 본문 구간 (2026-07)
describe('extractSoopDescription', () => {
  it('board_detail 본문만 평문으로 뽑는다', () => {
    const description = extractSoopDescription(loadFixture('soop-detail.html'));

    expect(description).toBeTruthy();
    expect(description).toContain('[팀소개]');
    // 헤더·"유사한 공고" 사이드바·푸터는 본문이 아니다
    expect(description).not.toContain('SOOP채용');
    expect(description).not.toContain('유사한 공고를 알려드려요');
    expect(description).not.toContain('개인정보처리방침');
    expect(description).not.toMatch(/<[a-z]/i);
  });

  it('board_detail이 없으면(구조 변경) undefined를 반환한다', () => {
    expect(extractSoopDescription('<html><body>없음</body></html>')).toBeUndefined();
  });
});
