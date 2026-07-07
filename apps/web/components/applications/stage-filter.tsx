import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  APPLICATION_FILTERS,
  dashboardHref,
  type ApplicationFilterKey,
} from "@/lib/stages";

/** 단계별 필터 — searchParams 기반 Link (클라이언트 상태 없음) */
export function StageFilter({ current }: { current: ApplicationFilterKey }) {
  return (
    <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
      {APPLICATION_FILTERS.map((filter) => (
        <Link
          key={filter.key}
          href={dashboardHref(filter.key)}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors",
            current === filter.key
              ? "bg-background text-foreground shadow-sm"
              : "hover:text-foreground",
          )}
        >
          {filter.label}
        </Link>
      ))}
    </div>
  );
}
