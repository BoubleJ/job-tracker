"use client";

import { useActionState, useEffect, useState } from "react";
import {
  SCRAPE_STRATEGIES,
  type ScrapeStrategy,
} from "@job-tracker/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  registerCompanyAction,
  type RegisterCompanyState,
} from "@/lib/actions/companies";

const STRATEGY_LABELS: Record<ScrapeStrategy, string> = {
  greeting: "그리팅 (greetinghr.com)",
  ninehire: "나인하이어 (ninehire.site)",
  lever: "Lever",
  greenhouse: "Greenhouse",
  jobflex: "JOBFLEX (recruiter.co.kr)",
  banksalad: "뱅크샐러드 (corp.banksalad.com)",
  naver: "네이버 계열 (recruit.navercorp.com / snowcorp.com)",
  kakao: "카카오 (careers.kakao.com)",
  kakaobank: "카카오뱅크 (recruit.kakaobank.com)",
  soop: "SOOP (recruit.sooplive.com)",
  soomgo: "숨고 (soomgo.team)",
  llm: "자체 채용페이지 (LLM 추출)",
};

const initialState: RegisterCompanyState = {};

/** 회사 등록 폼 — 전략 선택에 따라 scrape_config 필드가 바뀐다 */
export function CompanyRegisterDialog() {
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState<ScrapeStrategy>("greeting");
  const [state, formAction, isPending] = useActionState(
    registerCompanyAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>회사 등록</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회사 등록</DialogTitle>
          <DialogDescription>
            등록하면 재지원/중복지원 정책을 1회 자동 추출합니다. 공고는 다음
            스크래핑 주기에 수집됩니다.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">회사명</Label>
            <Input id="company-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-careers-url">채용페이지 URL</Label>
            <Input
              id="company-careers-url"
              name="careersUrl"
              type="url"
              placeholder="https://..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label>스크래핑 전략</Label>
            <Select
              value={strategy}
              onValueChange={(value: string) =>
                setStrategy(value as ScrapeStrategy)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCRAPE_STRATEGIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STRATEGY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="strategy" value={strategy} />
          </div>

          {strategy === "lever" ? (
            <div className="space-y-2">
              <Label htmlFor="config-site">Lever site (회사 slug)</Label>
              <Input
                id="config-site"
                name="site"
                placeholder="예: mycompany"
                required
              />
            </div>
          ) : null}

          {strategy === "greenhouse" ? (
            <div className="space-y-2">
              <Label htmlFor="config-board-token">Greenhouse board token</Label>
              <Input
                id="config-board-token"
                name="boardToken"
                placeholder="예: mycompany"
                required
              />
            </div>
          ) : null}

          {strategy === "greeting" ||
          strategy === "ninehire" ||
          strategy === "naver" ||
          strategy === "kakao" ||
          strategy === "soop" ||
          strategy === "soomgo" ||
          strategy === "llm" ? (
            <div className="space-y-2">
              <Label htmlFor="config-url">
                {strategy === "llm"
                  ? "채용페이지 URL"
                  : strategy === "naver" || strategy === "kakao"
                    ? "채용 목록 URL (직군 필터 쿼리 포함)"
                    : "채용페이지 URL (커스텀 도메인 포함)"}
              </Label>
              <Input
                id="config-url"
                name="configUrl"
                type="url"
                placeholder="https://..."
                required
              />
            </div>
          ) : null}

          {strategy === "llm" ? (
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="needsBrowser"
                className="size-4 accent-primary"
              />
              CSR 페이지 (Playwright 렌더링 필요)
            </label>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="config-policy-url">
              정책 안내 URL{" "}
              <span className="font-normal text-muted-foreground">
                (선택 — 재지원/중복지원 안내가 채용페이지 밖에 있을 때)
              </span>
            </Label>
            <Input
              id="config-policy-url"
              name="policyUrl"
              type="url"
              placeholder="https://..."
            />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "등록 중…" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
