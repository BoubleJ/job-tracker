import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApplicationSummary } from "@/lib/stages";

/** 상단 요약 카드 4종 — 표시 전용 */
export function SummaryCards({ summary }: { summary: ApplicationSummary }) {
  const items = [
    { label: "전체 지원", value: `${summary.total}건` },
    { label: "진행 중", value: `${summary.inProgress}건` },
    {
      label: "서류합격률",
      value:
        summary.docPassRate === null
          ? "—"
          : `${Math.round(summary.docPassRate * 100)}%`,
      hint: summary.docPassRate === null ? "서류 결과 대기" : undefined,
    },
    { label: "최종합격 · 오퍼", value: `${summary.finalCount}건` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="gap-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{item.value}</p>
            {item.hint ? (
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
