import { describe, expect, it } from "vitest";

import {
  addMonths,
  computeReapplyStatus,
  formatReapplyStatus,
  hasApplied,
  lastAppliedAt,
  matchApplicationsToPosting,
} from "./applied";

const posting = { id: "p1", companyId: "c1", title: "프론트엔드 개발자" };

const applications = [
  // 직접 연결
  { companyId: "c1", jobPostingId: "p1", position: "무관한 이름", appliedAt: "2026-01-10" },
  // 같은 회사 + 직무명 포함 매칭
  {
    companyId: "c1",
    jobPostingId: null,
    position: "프론트엔드 개발자 (신입)",
    appliedAt: "2026-03-20",
  },
  // 다른 회사 — 매칭 안 됨
  { companyId: "c2", jobPostingId: null, position: "프론트엔드 개발자", appliedAt: "2026-04-01" },
  // 같은 회사, 다른 직무 — 매칭 안 됨
  { companyId: "c1", jobPostingId: null, position: "백엔드 개발자", appliedAt: "2026-05-01" },
];

describe("matchApplicationsToPosting", () => {
  it("직접 연결과 회사+직무 매칭만 고른다", () => {
    const matched = matchApplicationsToPosting(posting, applications);
    expect(matched).toHaveLength(2);
    expect(matched.map((m) => m.appliedAt)).toEqual(["2026-01-10", "2026-03-20"]);
  });

  it("hasApplied / lastAppliedAt", () => {
    expect(hasApplied(posting, applications)).toBe(true);
    expect(lastAppliedAt(posting, applications)).toBe("2026-03-20");

    const other = { id: "p9", companyId: "c9", title: "데이터 엔지니어" };
    expect(hasApplied(other, applications)).toBe(false);
    expect(lastAppliedAt(other, applications)).toBeNull();
  });
});

describe("addMonths", () => {
  it("일반 케이스", () => {
    expect(addMonths("2026-03-20", 6)).toBe("2026-09-20");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("월말 오버플로는 말일로 clamp", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); // 윤년
  });
});

describe("computeReapplyStatus", () => {
  const now = new Date("2026-07-05T10:00:00");

  it("allowed → 즉시 가능, not_allowed → 불가", () => {
    expect(computeReapplyStatus("allowed", null, "2026-06-01", now)).toEqual({
      kind: "available",
    });
    expect(computeReapplyStatus("not_allowed", null, "2026-06-01", now)).toEqual({
      kind: "not_allowed",
    });
  });

  it("conditional + 개월 수 → 대기 D-day", () => {
    // 2026-03-20 + 6개월 = 2026-09-20, 오늘 2026-07-05 → 남은 77일
    const status = computeReapplyStatus(
      "conditional",
      "재지원은 6개월 이후 가능, 중복지원 가능",
      "2026-03-20",
      now,
    );
    expect(status).toEqual({ kind: "waiting", days: 77, availableOn: "2026-09-20" });
  });

  it("conditional + 기간 경과 → 재지원 가능", () => {
    const status = computeReapplyStatus(
      "conditional",
      "재지원은 3개월 이후 가능",
      "2026-01-10",
      now,
    );
    expect(status).toEqual({ kind: "available" });
  });

  it("conditional인데 개월 수 불명 / 정책 unknown / 지원이력 없음 → unknown", () => {
    expect(
      computeReapplyStatus("conditional", "재지원 별도 문의", "2026-01-10", now),
    ).toEqual({ kind: "unknown" });
    expect(computeReapplyStatus("unknown", null, "2026-01-10", now)).toEqual({
      kind: "unknown",
    });
    expect(computeReapplyStatus("conditional", "재지원 6개월", null, now)).toEqual({
      kind: "unknown",
    });
  });
});

describe("formatReapplyStatus", () => {
  it("문구 포맷", () => {
    expect(formatReapplyStatus({ kind: "available" })).toBe("재지원 가능");
    expect(
      formatReapplyStatus({ kind: "waiting", days: 14, availableOn: "2026-08-01" }),
    ).toBe("재지원까지 D-14");
    expect(formatReapplyStatus({ kind: "not_allowed" })).toBe("재지원 불가");
    expect(formatReapplyStatus({ kind: "unknown" })).toBeNull();
  });
});
