"use client";

import { useRouter } from "next/navigation";
import { CATEGORIES, type Category } from "@job-tracker/shared";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildJobsHref,
  CATEGORY_LABELS,
  type JobsFilterState,
  type JobsView,
} from "@/lib/jobs";

/** /jobs 필터 바 — 상태는 전부 URL searchParams (뷰 토글/카테고리/회사/진행중) */
export function JobsFilter({
  state,
  companies,
}: {
  state: JobsFilterState;
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();

  const update = (patch: Partial<JobsFilterState>) => {
    router.replace(buildJobsHref({ ...state, ...patch }), { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tabs
        value={state.view}
        onValueChange={(value: string) => update({ view: value as JobsView })}
      >
        <TabsList>
          <TabsTrigger value="grouped">기업별</TabsTrigger>
          <TabsTrigger value="flat">전체 목록</TabsTrigger>
        </TabsList>
      </Tabs>

      <Select
        value={state.category}
        onValueChange={(value: string) =>
          update({ category: value as Category | "all" })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="직군" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 직군</SelectItem>
          {CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={state.companyId}
        onValueChange={(value: string) => update({ companyId: value })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="회사" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 회사</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.openOnly}
          onChange={(event) => update({ openOnly: event.target.checked })}
          className="size-4 accent-primary"
        />
        진행 중만
      </label>
    </div>
  );
}
