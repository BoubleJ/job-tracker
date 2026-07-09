import {
  CATEGORIES,
  type ApplyPolicy,
  type Category,
  type JobPostingStatus,
} from "@job-tracker/shared";

import type { BadgeVariant } from "@/components/ui/badge";

/** 채용공고 목록(/jobs) 표시·필터용 순수 함수 모음 */

export const CATEGORY_LABELS: Record<Category, string> = {
  frontend: "프론트엔드",
  backend: "백엔드",
  fullstack: "풀스택",
  mobile: "모바일",
  devops: "DevOps",
  data_ai: "데이터/AI",
  qa: "QA",
  game: "게임 개발",
  etc_dev: "기타 개발",
};

type KnownPolicy = Exclude<ApplyPolicy, "unknown">;

export const REAPPLY_POLICY_LABELS: Record<KnownPolicy, string> = {
  allowed: "재지원 가능",
  not_allowed: "재지원 불가",
  conditional: "재지원 조건부",
};

export const DUPLICATE_POLICY_LABELS: Record<KnownPolicy, string> = {
  allowed: "중복지원 가능",
  not_allowed: "중복지원 불가",
  conditional: "중복지원 조건부",
};

/**
 * policyNote에서 재지원 대기 개월 수를 뽑는다 (예: "재지원은 6개월 이후 가능, ..." → 6).
 * note는 "재지원…, 중복지원…" 절이 쉼표로 이어진 자유 텍스트이므로 재지원 절만 보고 찾는다.
 * 못 찾으면 null — 호출부가 일반 "재지원 조건부" 라벨로 폴백한다.
 */
export function reapplyPeriodMonths(policyNote?: string | null): number | null {
  const clause = policyNote?.split(",").find((part) => part.includes("재지원"));
  const matched = clause?.match(/(\d+)\s*개월/);
  return matched?.[1] ? Number(matched[1]) : null;
}

/** 재지원 배지 문구 — conditional이고 기간을 알면 "6개월 후 재지원가능"으로 구체화한다 */
export function reapplyPolicyLabel(
  policy: KnownPolicy,
  policyNote?: string | null,
): string {
  if (policy !== "conditional") return REAPPLY_POLICY_LABELS[policy];
  const months = reapplyPeriodMonths(policyNote);
  return months === null
    ? REAPPLY_POLICY_LABELS.conditional
    : `${months}개월 후 재지원가능`;
}

export function policyBadgeVariant(policy: KnownPolicy): BadgeVariant {
  switch (policy) {
    case "allowed":
      return "success";
    case "not_allowed":
      return "destructive";
    case "conditional":
      return "warning";
  }
}

// --- searchParams 기반 필터 상태 ---

export type JobsView = "grouped" | "flat";

export type JobsFilterState = {
  category: Category | "all";
  companyId: string | "all";
  openOnly: boolean;
  view: JobsView;
};

export function parseJobsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): JobsFilterState {
  const category =
    typeof sp.category === "string" &&
    (CATEGORIES as readonly string[]).includes(sp.category)
      ? (sp.category as Category)
      : "all";
  const companyId =
    typeof sp.company === "string" && sp.company.length > 0 ? sp.company : "all";
  return {
    category,
    companyId,
    openOnly: sp.open === "1",
    view: sp.view === "flat" ? "flat" : "grouped",
  };
}

export function buildJobsHref(state: JobsFilterState): string {
  const params = new URLSearchParams();
  if (state.category !== "all") params.set("category", state.category);
  if (state.companyId !== "all") params.set("company", state.companyId);
  if (state.openOnly) params.set("open", "1");
  if (state.view !== "grouped") params.set("view", state.view);
  const qs = params.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

export function filterJobPostings<
  T extends { category: Category; companyId: string; status: JobPostingStatus },
>(postings: readonly T[], state: JobsFilterState): T[] {
  return postings.filter(
    (p) =>
      (state.category === "all" || p.category === state.category) &&
      (state.companyId === "all" || p.companyId === state.companyId) &&
      (!state.openOnly || p.status === "open"),
  );
}

// --- D-day · NEW 배지 ---

const DAY_MS = 24 * 60 * 60 * 1000;

/** 마감까지 남은 일수 (오늘 0시 기준, 마감 당일 0). 지났으면 음수 */
export function daysUntil(deadline: string, now: Date = new Date()): number {
  const end = new Date(`${deadline}T00:00:00`);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end.getTime() - startOfToday.getTime()) / DAY_MS);
}

/** 'D-3' | 'D-Day' | '마감' | null(상시채용) */
export function formatDday(
  deadline: string | null,
  now: Date = new Date(),
): string | null {
  if (!deadline) return null;
  const d = daysUntil(deadline, now);
  if (d > 0) return `D-${d}`;
  if (d === 0) return "D-Day";
  return "마감";
}

/** first_seen_at이 최근 3일 이내면 NEW */
export function isNewPosting(firstSeenAt: Date, now: Date = new Date()): boolean {
  const elapsed = now.getTime() - firstSeenAt.getTime();
  return elapsed >= 0 && elapsed <= 3 * DAY_MS;
}
