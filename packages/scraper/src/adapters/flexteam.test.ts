import { describe, expect, it } from 'vitest';
import { loadFixture, loadJsonFixture } from '../../test/fixture';
import {
  extractCustomerIdHash,
  parseFlexteamJobDescriptions,
} from './flexteam';

const ORIGIN = 'https://flex.careers.team';

// fixture: flex.careers.team/job-descriptions 채용페이지 __NEXT_DATA__ (customerIdHash 발췌)
describe('extractCustomerIdHash', () => {
  it('__NEXT_DATA__에서 customerIdHash를 뽑는다', () => {
    expect(extractCustomerIdHash(loadFixture('flexteam-careers.html'))).toBe(
      '65Y06m8XpK',
    );
  });

  it('__NEXT_DATA__가 없으면 throw한다 (조용한 실패 금지)', () => {
    expect(() => extractCustomerIdHash('<html><body>no data</body></html>')).toThrow();
  });

  it('recruitingSiteResponse 형태가 아니면 throw한다', () => {
    expect(() =>
      extractCustomerIdHash(
        '<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script>',
      ),
    ).toThrow();
  });
});

// fixture: flex.team 공개 목록 API 실측 응답 3건 (기간채용 / 상시+과거마감일 / 상시+마감일없음)
describe('parseFlexteamJobDescriptions', () => {
  it('정식 제목과 {origin}/job-descriptions/{idHash} URL로 변환한다', () => {
    const results = parseFlexteamJobDescriptions(
      loadJsonFixture('flexteam-list.json'),
      ORIGIN,
    );

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      title: 'Customer Consultant (Sales) Intern (6개월, 채용연계형)',
      url: 'https://flex.careers.team/job-descriptions/7907edgEgJ',
      deadline: '2026-07-26',
    });
  });

  it('제목에 딱지(Permanent·Always hiring)를 붙이지 않는다 — 정식 제목 그대로', () => {
    const results = parseFlexteamJobDescriptions(
      loadJsonFixture('flexteam-list.json'),
      ORIGIN,
    );

    expect(results.map((r) => r.title)).toEqual([
      'Customer Consultant (Sales) Intern (6개월, 채용연계형)',
      '[Product] Product Designer (Web)',
      '[Product] Forward Deployment Engineer (FDE)',
    ]);
  });

  it('기간 채용은 recruitingEndDate를 마감일로 쓴다', () => {
    const results = parseFlexteamJobDescriptions(
      loadJsonFixture('flexteam-list.json'),
      ORIGIN,
    );

    expect(results[0]?.deadline).toBe('2026-07-26');
  });

  it('상시채용은 마감일을 넣지 않는다 (낡은 과거 recruitingEndDate 무시)', () => {
    const results = parseFlexteamJobDescriptions(
      loadJsonFixture('flexteam-list.json'),
      ORIGIN,
    );

    // gbr04KM8KJ: isOccasionalRecruitment=true인데 recruitingEndDate=2025-01-20(과거) → 무시
    const designer = results.find((r) => r.url.endsWith('/gbr04KM8KJ'));
    expect(designer && 'deadline' in designer).toBe(false);
    // 5xEwvjyzbl: 상시 + recruitingEndDate 없음
    const fde = results.find((r) => r.url.endsWith('/5xEwvjyzbl'));
    expect(fde && 'deadline' in fde).toBe(false);
  });

  it('스키마에 맞지 않으면 throw한다 (조용한 실패 금지)', () => {
    expect(() => parseFlexteamJobDescriptions({}, ORIGIN)).toThrow();
    expect(() =>
      parseFlexteamJobDescriptions({ jobDescriptions: [{ title: 'x' }] }, ORIGIN),
    ).toThrow();
  });
});
