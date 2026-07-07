import { ExternalLinkIcon } from "lucide-react";
import type { JobPosting } from "@job-tracker/db";

import { AddApplicationDialog } from "@/components/jobs/add-application-dialog";
import { CategoryBadgeEditor } from "@/components/jobs/category-badge-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { formatDday, isNewPosting } from "@/lib/jobs";

/** 공고 카드 — 회사명(옵션)/공고명/D-day/원문 링크/상태·카테고리·NEW 배지 */
export function JobCard({
  posting,
  companyId,
  companyName,
  showCompany,
  now,
  today,
}: {
  posting: JobPosting;
  companyId: string;
  companyName: string;
  /** 플랫 뷰에서 회사명을 함께 표시 */
  showCompany: boolean;
  now: Date;
  /** AddApplicationDialog 기본 지원일 (YYYY-MM-DD, KST) */
  today: string;
}) {
  const dday = formatDday(posting.deadline, now);
  const isNew = posting.status === "open" && isNewPosting(posting.firstSeenAt, now);
  const closed = posting.status === "closed";

  return (
    <Card className={closed ? "opacity-60" : undefined}>
      <CardHeader className="gap-2">
        {showCompany ? (
          <p className="text-xs font-medium text-muted-foreground">
            {companyName}
          </p>
        ) : null}
        <a
          href={posting.url}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-start gap-1 font-semibold leading-snug hover:underline"
        >
          {posting.title}
          <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </a>
        <div className="flex flex-wrap items-center gap-1.5">
          {isNew ? (
            <Badge className="bg-chart-1 text-white">NEW</Badge>
          ) : null}
          <Badge variant={closed ? "outline" : "success"}>
            {closed ? "closed" : "open"}
          </Badge>
          <CategoryBadgeEditor
            jobPostingId={posting.id}
            category={posting.category}
          />
          {dday ? (
            <Badge variant={dday === "마감" ? "outline" : "warning"}>{dday}</Badge>
          ) : (
            <Badge variant="outline">상시채용</Badge>
          )}
        </div>
      </CardHeader>
      {posting.description ? (
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {posting.description}
          </p>
        </CardContent>
      ) : null}
      <CardFooter className="mt-auto justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {posting.deadline
            ? `마감 ${formatDate(posting.deadline)}`
            : "마감일 없음"}
        </span>
        <AddApplicationDialog
          companyId={companyId}
          companyName={companyName}
          jobPostingId={posting.id}
          defaultPosition={posting.title}
          defaultAppliedAt={today}
        />
      </CardFooter>
    </Card>
  );
}
