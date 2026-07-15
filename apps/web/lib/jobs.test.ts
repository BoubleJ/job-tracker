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
  toggleCategory,
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
  it("parse → build 왕복이 보존된다 (복수 직군)", () => {
    const sp = {
      category: "backend,frontend",
      company: "c1",
      open: "1",
      unapplied: "1",
      view: "flat",
    };
    const state = parseJobsSearchParams(sp);
    expect(state).toEqual({
      categories: ["backend", "frontend"],
      companyId: "c1",
      openOnly: true,
      unappliedOnly: true,
      view: "flat",
    });
    expect(buildJobsHref(state)).toBe(
      "/jobs?category=backend%2Cfrontend&company=c1&open=1&unapplied=1&view=flat",
    );
  });

  it("category가 배열로 와도 파싱하고, 잘못된 값은 제외한다", () => {
    const state = parseJobsSearchParams({ category: ["backend", "designer"] });
    expect(state.categories).toEqual(["backend"]);
  });

  it("기본값(빈 필터)", () => {
    expect(parseJobsSearchParams({ category: "designer", view: "x" })).toEqual({
      categories: [],
      companyId: "all",
      openOnly: false,
      unappliedOnly: false,
      view: "grouped",
    });
    expect(
      buildJobsHref({
        categories: [],
        companyId: "all",
        openOnly: false,
        unappliedOnly: false,
        view: "grouped",
      }),
    ).toBe("/jobs");
  });
});

describe("toggleCategory", () => {
  it("없으면 추가, 있으면 제거 (순서 보존)", () => {
    expect(toggleCategory(["backend"], "frontend")).toEqual([
      "backend",
      "frontend",
    ]);
    expect(toggleCategory(["backend", "frontend"], "backend")).toEqual([
      "frontend",
    ]);
  });
});

describe("filterJobPostings", () => {
  const postings = [
    { id: "p1", category: "backend", companyId: "c1", status: "open" },
    { id: "p2", category: "frontend", companyId: "c1", status: "closed" },
    { id: "p3", category: "backend", companyId: "c2", status: "closed" },
  ] as const;

  it("직군(복수)/회사/진행중 조건을 모두 적용", () => {
    const all = parseJobsSearchParams({});
    expect(filterJobPostings([...postings], all)).toHaveLength(3);
    expect(
      filterJobPostings([...postings], { ...all, categories: ["backend"] }),
    ).toHaveLength(2);
    // 복수 직군: backend OR frontend → 전부
    expect(
      filterJobPostings([...postings], {
        ...all,
        categories: ["backend", "frontend"],
      }),
    ).toHaveLength(3);
    expect(
      filterJobPostings([...postings], {
        ...all,
        categories: ["backend"],
        openOnly: true,
      }),
    ).toHaveLength(1);
    expect(
      filterJobPostings([...postings], { ...all, companyId: "c2" }),
    ).toHaveLength(1);
  });

  it("미지원만 보기: isApplied가 true인 공고를 제외", () => {
    const all = parseJobsSearchParams({});
    const appliedIds = new Set(["p1"]);
    expect(
      filterJobPostings([...postings], { ...all, unappliedOnly: true }, (p) =>
        appliedIds.has(p.id),
      ),
    ).toHaveLength(2);
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
