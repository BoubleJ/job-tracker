import { describe, expect, it } from "vitest";

import {
  buildJobsHref,
  daysUntil,
  filterJobPostings,
  formatDday,
  isNewPosting,
  parseJobsSearchParams,
  reapplyPeriodMonths,
  reapplyPolicyLabel,
} from "./jobs";

describe("D-day", () => {
  const now = new Date("2026-07-05T10:00:00");

  it("남은 일수 계산 (오늘 0시 기준)", () => {
    expect(daysUntil("2026-07-08", now)).toBe(3);
    expect(daysUntil("2026-07-05", now)).toBe(0);
    expect(daysUntil("2026-07-04", now)).toBe(-1);
  });

  it("포맷: D-n / D-Day / 마감 / 상시(null)", () => {
    expect(formatDday("2026-07-08", now)).toBe("D-3");
    expect(formatDday("2026-07-05", now)).toBe("D-Day");
    expect(formatDday("2026-07-01", now)).toBe("마감");
    expect(formatDday(null, now)).toBeNull();
  });
});

describe("isNewPosting", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  it("3일 이내면 NEW", () => {
    expect(isNewPosting(new Date("2026-07-04T12:00:00Z"), now)).toBe(true);
    expect(isNewPosting(new Date("2026-07-02T12:00:00Z"), now)).toBe(true);
    expect(isNewPosting(new Date("2026-07-01T11:59:00Z"), now)).toBe(false);
  });
});

describe("searchParams 왕복", () => {
  it("parse → build 왕복이 보존된다", () => {
    const sp = { category: "backend", company: "c1", open: "1", view: "flat" };
    const state = parseJobsSearchParams(sp);
    expect(state).toEqual({
      category: "backend",
      companyId: "c1",
      openOnly: true,
      view: "flat",
    });
    expect(buildJobsHref(state)).toBe(
      "/jobs?category=backend&company=c1&open=1&view=flat",
    );
  });

  it("잘못된 값은 기본값으로", () => {
    expect(parseJobsSearchParams({ category: "designer", view: "x" })).toEqual({
      category: "all",
      companyId: "all",
      openOnly: false,
      view: "grouped",
    });
    expect(
      buildJobsHref({
        category: "all",
        companyId: "all",
        openOnly: false,
        view: "grouped",
      }),
    ).toBe("/jobs");
  });
});

describe("filterJobPostings", () => {
  const postings = [
    { category: "backend", companyId: "c1", status: "open" },
    { category: "frontend", companyId: "c1", status: "closed" },
    { category: "backend", companyId: "c2", status: "closed" },
  ] as const;

  it("카테고리/회사/진행중 조건을 모두 적용", () => {
    const all = parseJobsSearchParams({});
    expect(filterJobPostings([...postings], all)).toHaveLength(3);
    expect(
      filterJobPostings([...postings], { ...all, category: "backend" }),
    ).toHaveLength(2);
    expect(
      filterJobPostings([...postings], {
        ...all,
        category: "backend",
        openOnly: true,
      }),
    ).toHaveLength(1);
    expect(
      filterJobPostings([...postings], { ...all, companyId: "c2" }),
    ).toHaveLength(1);
  });
});

describe("재지원 정책 라벨", () => {
  it("conditional + note의 개월 수 → 구체 라벨", () => {
    expect(
      reapplyPolicyLabel("conditional", "재지원은 6개월 이후 가능, 중복지원 가능"),
    ).toBe("6개월 후 재지원가능");
    expect(
      reapplyPolicyLabel("conditional", "재지원은 3개월 이후 가능, 중복지원 가능"),
    ).toBe("3개월 후 재지원가능");
  });

  it("'불합격 6개월 이후' 처럼 수식어가 붙어도 개월 수를 찾는다", () => {
    expect(
      reapplyPolicyLabel(
        "conditional",
        "재지원은 불합격 6개월 이후 가능, 중복지원 불가",
      ),
    ).toBe("6개월 후 재지원가능");
  });

  it("중복지원 절의 개월 수는 재지원 라벨에 쓰지 않는다", () => {
    expect(
      reapplyPolicyLabel("conditional", "재지원 조건 안내 없음, 중복지원은 3개월 이후"),
    ).toBe("재지원 조건부");
  });

  it("note가 없거나 기간이 없으면 일반 조건부 라벨로 폴백", () => {
    expect(reapplyPolicyLabel("conditional", null)).toBe("재지원 조건부");
    expect(reapplyPolicyLabel("conditional", "재지원은 별도 문의")).toBe("재지원 조건부");
  });

  it("conditional이 아니면 note를 무시한다", () => {
    expect(reapplyPolicyLabel("allowed", "재지원은 6개월 이후 가능")).toBe("재지원 가능");
    expect(reapplyPolicyLabel("not_allowed", null)).toBe("재지원 불가");
  });

  it("reapplyPeriodMonths 단독", () => {
    expect(reapplyPeriodMonths("재지원은 12개월 이후 가능")).toBe(12);
    expect(reapplyPeriodMonths(undefined)).toBeNull();
  });
});
