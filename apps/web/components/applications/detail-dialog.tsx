"use client";

import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * searchParams(?app=id)로 열리는 상세 Dialog 셸.
 * 내용(타임라인)은 서버에서 렌더된 children — 이 컴포넌트는 닫기 내비게이션만 담당.
 */
export function DetailDialog({
  title,
  description,
  closeHref,
  children,
}: {
  title: string;
  description?: string;
  closeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Dialog
      open
      onOpenChange={(open: boolean) => {
        if (!open) router.push(closeHref, { scroll: false });
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
