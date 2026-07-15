"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

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
import { archiveJobPostingAction } from "@/lib/actions/archive";

/**
 * 공고 보관 버튼 + 다이얼로그 (스펙 5장).
 * 보관 진행 상태와 저장된 본문 미리보기, 보관함 링크를 피드백으로 노출한다.
 */
export function ArchiveButton({
  jobPostingId,
  archived,
}: {
  jobPostingId: string;
  archived: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(archived);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await archiveJobPostingAction(jobPostingId);
      if (res.ok) {
        setContent(res.content);
        setDone(true);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={archived ? "outline" : "ghost"} size="sm">
          {archived ? "보관됨" : "보관"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>공고 보관</DialogTitle>
          <DialogDescription>
            {done
              ? "이 공고는 보관함에 저장되어 있습니다. 원문이 내려가도 다시 볼 수 있어요."
              : "공고 상세 내용을 가져와 보관함에 저장합니다."}
          </DialogDescription>
        </DialogHeader>

        {content !== null ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              저장된 내용 미리보기
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm text-foreground">
              {content.slice(0, 1500) || "본문을 가져오지 못했습니다."}
            </pre>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 sm:gap-2">
          {done ? (
            <>
              <Button asChild variant="outline">
                <Link href="/jobs/archive">보관함에서 보기</Link>
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>
                닫기
              </Button>
            </>
          ) : (
            <Button type="button" onClick={run} disabled={pending}>
              {pending ? "보관 중…" : "보관하기"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
