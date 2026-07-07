import { asc, desc } from "drizzle-orm";
import { companies, jobPostings, type JobPosting } from "@job-tracker/db";

import { CompanyGroup } from "@/components/jobs/company-group";
import { CompanyRegisterDialog } from "@/components/jobs/company-register-dialog";
import { JobCard } from "@/components/jobs/job-card";
import { JobsFilter } from "@/components/jobs/jobs-filter";
import { getDb } from "@/lib/db";
import { todayIsoDate } from "@/lib/format";
import { filterJobPostings, parseJobsSearchParams } from "@/lib/jobs";

// DB를 요청 시점에 조회한다 (DATABASE_URL 없이도 빌드 가능)
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filterState = parseJobsSearchParams(sp);
  const now = new Date();
  const today = todayIsoDate(now);

  const db = getDb();
  const [companyRows, postingRows] = await Promise.all([
    db.query.companies.findMany({
      with: { applications: true },
      orderBy: [asc(companies.name)],
    }),
    db.query.jobPostings.findMany({
      orderBy: [desc(jobPostings.firstSeenAt)],
    }),
  ]);

  const filtered = filterJobPostings(postingRows, filterState);
  const postingsByCompany = new Map<string, JobPosting[]>();
  for (const posting of filtered) {
    const list = postingsByCompany.get(posting.companyId);
    if (list) {
      list.push(posting);
    } else {
      postingsByCompany.set(posting.companyId, [posting]);
    }
  }
  const companiesById = new Map(companyRows.map((c) => [c.id, c]));

  // 공고 조건 필터가 걸려 있으면 매칭 공고가 있는 회사만, 아니면 (공고 없는 신규 회사 포함) 전부
  const hasPostingFilter = filterState.category !== "all" || filterState.openOnly;
  const groupedCompanies = companyRows.filter(
    (company) =>
      (filterState.companyId === "all" || company.id === filterState.companyId) &&
      (!hasPostingFilter || (postingsByCompany.get(company.id)?.length ?? 0) > 0),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">채용공고</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length}건 표시 · 전체 {postingRows.length}건
          </p>
        </div>
        <CompanyRegisterDialog />
      </div>

      <JobsFilter
        state={filterState}
        companies={companyRows.map((c) => ({ id: c.id, name: c.name }))}
      />

      {companyRows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          등록된 회사가 없습니다. 오른쪽 위 “회사 등록”으로 시작하세요.
        </p>
      ) : filterState.view === "grouped" ? (
        <div className="space-y-10">
          {groupedCompanies.length === 0 ? (
            <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              조건에 맞는 공고가 없습니다.
            </p>
          ) : (
            groupedCompanies.map((company) => (
              <CompanyGroup
                key={company.id}
                company={company}
                postings={postingsByCompany.get(company.id) ?? []}
                now={now}
                today={today}
              />
            ))
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          조건에 맞는 공고가 없습니다.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((posting) => {
            const company = companiesById.get(posting.companyId);
            return (
              <JobCard
                key={posting.id}
                posting={posting}
                companyId={posting.companyId}
                companyName={company?.name ?? "알 수 없는 회사"}
                showCompany
                now={now}
                today={today}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
