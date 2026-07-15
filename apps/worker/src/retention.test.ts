import { describe, expect, it } from "vitest";

import { retentionCutoff } from "./retention";

describe("retentionCutoff", () => {
  it("7개월 이전 날짜를 구한다", () => {
    expect(retentionCutoff("2026-07-15", 7)).toBe("2025-12-15");
    expect(retentionCutoff("2026-08-01", 7)).toBe("2026-01-01");
  });

  it("연도 경계를 넘어간다", () => {
    expect(retentionCutoff("2026-03-10", 7)).toBe("2025-08-10");
    expect(retentionCutoff("2026-01-15", 7)).toBe("2025-06-15");
  });

  it("월말 오버플로는 대상 월 말일로 clamp", () => {
    // 7개월 전이 2월 → 31일 없음 → 28일
    expect(retentionCutoff("2026-09-30", 7)).toBe("2026-02-28");
    // 윤년 2월
    expect(retentionCutoff("2024-09-30", 7)).toBe("2024-02-29");
  });

  it("months 값에 따라 달라진다", () => {
    expect(retentionCutoff("2026-07-15", 6)).toBe("2026-01-15");
    expect(retentionCutoff("2026-07-15", 12)).toBe("2025-07-15");
  });
});
