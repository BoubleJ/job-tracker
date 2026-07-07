"use client";

import { useState } from "react";

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
import { createApplicationAction } from "@/lib/actions/applications";

/** 공고 카드의 "지원 기록 추가" — applications 수동 생성 Dialog */
export function AddApplicationDialog({
  companyId,
  companyName,
  jobPostingId,
  defaultPosition,
  defaultAppliedAt,
}: {
  companyId: string;
  companyName: string;
  jobPostingId?: string;
  defaultPosition: string;
  /** RSC에서 계산한 오늘 날짜 (YYYY-MM-DD, KST) */
  defaultAppliedAt: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          지원 기록 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>지원 기록 추가</DialogTitle>
          <DialogDescription>
            {companyName} 공고에 대한 지원 기록을 남깁니다.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createApplicationAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="companyId" value={companyId} />
          {jobPostingId ? (
            <input type="hidden" name="jobPostingId" value={jobPostingId} />
          ) : null}
          <div className="space-y-2">
            <Label htmlFor={`position-${jobPostingId ?? companyId}`}>직무</Label>
            <Input
              id={`position-${jobPostingId ?? companyId}`}
              name="position"
              defaultValue={defaultPosition}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`appliedAt-${jobPostingId ?? companyId}`}>지원일</Label>
            <Input
              id={`appliedAt-${jobPostingId ?? companyId}`}
              name="appliedAt"
              type="date"
              defaultValue={defaultAppliedAt}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit">저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
