import { desc } from "drizzle-orm";
import { applications } from "@job-tracker/db";

import { ApplicationTable } from "@/components/applications/application-table";
import { DetailDialog } from "@/components/applications/detail-dialog";
import { EventTimeline } from "@/components/applications/event-timeline";
import { StageFilter } from "@/components/applications/stage-filter";
import { StageFunnel } from "@/components/applications/stage-funnel";
import { SummaryCards } from "@/components/applications/summary-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/format";
import {
  buildFunnelData,
  computeSummary,
  dashboardHref,
  filterApplications,
  parseFilterKey,
  STAGE_LABELS,
  stageBadgeVariant,
} from "@/lib/stages";

// DB를 요청 시점에 조회한다 (DATABASE_URL 없이도 빌드 가능)
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filterKey = parseFilterKey(sp.filter);
  const selectedId = typeof sp.app === "string" ? sp.app : undefined;

  const db = getDb();
  const rows = await db.query.applications.findMany({
    with: {
      company: true,
      events: {
        orderBy: (events, { desc: descFn }) => [
          descFn(events.occurredAt),
          descFn(events.createdAt),
        ],
      },
    },
    orderBy: [desc(applications.appliedAt), desc(applications.createdAt)],
  });

  const summary = computeSummary(rows);
  const funnelData = buildFunnelData(rows);
  const filtered = filterApplications(rows, filterKey);
  const selected = selectedId
    ? rows.find((row) => row.id === selectedId)
    : undefined;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">지원현황 대시보드</h1>

      <SummaryCards summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">단계별 퍼널</CardTitle>
        </CardHeader>
        <CardContent>
          <StageFunnel data={funnelData} />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <StageFilter current={filterKey} />
        <ApplicationTable applications={filtered} currentFilter={filterKey} />
      </section>

      {selected ? (
        <DetailDialog
          title={`${selected.company.name} — ${selected.position}`}
          description={`지원일 ${formatDate(selected.appliedAt)}`}
          closeHref={dashboardHref(filterKey)}
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">현재 단계</span>
            <Badge variant={stageBadgeVariant(selected.currentStage)}>
              {STAGE_LABELS[selected.currentStage]}
            </Badge>
          </div>
          <EventTimeline events={selected.events} />
        </DetailDialog>
      ) : null}
    </div>
  );
}
