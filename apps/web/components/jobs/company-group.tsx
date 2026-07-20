import type { Application, Company, JobPosting } from "@job-tracker/db";

import { JobCard } from "@/components/jobs/job-card";
import { PolicyBadges } from "@/components/jobs/policy-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppliedInfo } from "@/lib/applied";
import { refreshCompanyPolicyAction } from "@/lib/actions/companies";

export type CompanyWithApplications = Company & { applications: Application[] };

/** 지원 이력이 없는 공고용 기본값 */
const EMPTY_APPLIED_INFO: AppliedInfo = {
  applied: false,
  lastApplied: null,
  reapply: { kind: "unknown" },
};

/** 기업별 그룹 섹션 — 헤더(정책 배지·재지원 힌트·정책 재확인) + 공고 카드 그리드 */
export function CompanyGroup({
  company,
  postings,
  appliedInfoById,
  now,
  today,
}: {
  company: CompanyWithApplications;
  postings: JobPosting[];
  /** 공고 id → 지원 이력/재지원 상태 */
  appliedInfoById: Map<string, AppliedInfo>;
  now: Date;
  today: string;
}) {
  // 탈락한 지원 건이 있고 재지원 정책이 allowed면 힌트 노출 (스펙 7-6)
  const hasRejected = company.applications.some(
    (application) =>
      application.currentStage === "rejected" ||
      application.currentStage === "document_rejected",
  );
  const showReapplyHint = hasRejected && company.reapplyPolicy === "allowed";
  // 표시용 채용페이지 링크. careersPageUrl은 등록 시 항상 채워지는 단일 소스
  // (careersUrl은 스크랩 대상이라 어댑터 없는 회사는 ''로 비워 크론이 스킵한다).
  const careersLink = company.careersPageUrl;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{company.name}</h2>
        {careersLink ? (
          <a
            href={careersLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:underline"
          >
            채용페이지 ↗
          </a>
        ) : null}
        <PolicyBadges
          reapplyPolicy={company.reapplyPolicy}
          duplicateApplyPolicy={company.duplicateApplyPolicy}
          policyNote={company.policyNote}
        />
        {showReapplyHint ? (
          <Badge variant="success">탈락 이력 있음 · 재지원 가능</Badge>
        ) : null}
        <span className="text-xs text-muted-foreground">
          공고 {postings.length}건
        </span>
        <form action={refreshCompanyPolicyAction} className="ml-auto">
          <input type="hidden" name="companyId" value={company.id} />
          <Button type="submit" variant="ghost" size="sm">
            정책 재확인
          </Button>
        </form>
      </div>
      {company.policyNote ? (
        <p className="text-xs text-muted-foreground">
          정책 근거: “{company.policyNote}”
          {company.policySourceUrl ? (
            <a
              href={company.policySourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-1 underline"
            >
              출처
            </a>
          ) : null}
        </p>
      ) : null}
      {postings.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          조건에 맞는 공고가 없습니다.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {postings.map((posting) => (
            <JobCard
              key={posting.id}
              posting={posting}
              companyId={company.id}
              companyName={company.name}
              showCompany={false}
              appliedInfo={appliedInfoById.get(posting.id) ?? EMPTY_APPLIED_INFO}
              now={now}
              today={today}
            />
          ))}
        </div>
      )}
    </section>
  );
}
