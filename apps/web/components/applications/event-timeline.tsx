import { STAGES } from "@job-tracker/shared";
import type { ApplicationEvent } from "@job-tracker/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import {
  confirmEventAction,
  updateEventStageAction,
} from "@/lib/actions/applications";
import { STAGE_LABELS, stageBadgeVariant } from "@/lib/stages";

/**
 * 지원 건 이벤트 타임라인 (시간순).
 * needs_review 이벤트에는 "확인 필요" 표시와 수동 수정 폼(Server Action)을 붙인다.
 */
export function EventTimeline({ events }: { events: ApplicationEvent[] }) {
  const ordered = [...events].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );

  if (ordered.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        기록된 이벤트가 없습니다.
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {ordered.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
          {/* 타임라인 세로선 + 점 */}
          <div className="flex flex-col items-center">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
            {index < ordered.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={stageBadgeVariant(event.stage)}>
                {STAGE_LABELS[event.stage]}
              </Badge>
              {event.needsReview ? (
                <Badge variant="warning">확인 필요</Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatDateTime(event.occurredAt)}
              </span>
            </div>
            {event.summary ? (
              <p className="text-sm text-foreground">{event.summary}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {event.confidence !== null
                ? `신뢰도 ${event.confidence.toFixed(2)}`
                : "수동 기록"}
              {event.gmailMessageId ? (
                <span className="ml-2">근거 메일: {event.gmailMessageId}</span>
              ) : null}
            </p>
            {event.needsReview ? (
              <form
                action={updateEventStageAction}
                className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-warning/60 bg-warning/10 p-2"
              >
                <input type="hidden" name="eventId" value={event.id} />
                <select
                  name="stage"
                  defaultValue={event.stage}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm">
                  단계 수정
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  formAction={confirmEventAction}
                >
                  이상 없음
                </Button>
              </form>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
