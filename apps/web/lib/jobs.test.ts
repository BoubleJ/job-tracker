import { describe, expect, it } from "vitest";

import {
  buildJobsHref,
  daysUntil,
  filterJobPostings,
  formatDday,
  isNewPosting,
  parseJobsSearchParams,
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
