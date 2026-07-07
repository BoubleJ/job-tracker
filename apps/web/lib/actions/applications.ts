"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { applicationEvents, applications } from "@job-tracker/db";
import { stageSchema } from "@job-tracker/shared";

import { getDb } from "@/lib/db";

/** 공고 카드의 "지원 기록 추가" — applications + applied 이벤트 수동 생성 */
const createApplicationSchema = z.object({
  companyId: z.uuid(),
  jobPostingId: z.uuid().optional(),
  position: z.string().trim().min(1),
  appliedAt: z.iso.date(),
});

export async function createApplicationAction(formData: FormData): Promise<void> {
  const input = createApplicationSchema.parse({
    companyId: formData.get("companyId"),
    jobPostingId: formData.get("jobPostingId") || undefined,
    position: formData.get("position"),
    appliedAt: formData.get("appliedAt"),
  });

  const db = getDb();
  const inserted = await db
    .insert(applications)
    .values({
      companyId: input.companyId,
      jobPostingId: input.jobPostingId ?? null,
      position: input.position,
      appliedAt: input.appliedAt,
      currentStage: "applied",
    })
    .returning({ id: applications.id });

  const application = inserted[0];
  if (application) {
    await db.insert(applicationEvents).values({
      applicationId: application.id,
      stage: "applied",
      // date 컬럼(지원일) 기준 — KST 자정으로 기록
      occurredAt: new Date(`${input.appliedAt}T00:00:00+09:00`),
      summary: "공고에서 수동 등록",
    });
  }

  revalidatePath("/");
  revalidatePath("/jobs");
}

/** 이벤트의 최신 stage로 applications.current_stage 캐시를 재계산 */
async function refreshCurrentStage(applicationId: string): Promise<void> {
  const db = getDb();
  const latest = await db.query.applicationEvents.findFirst({
    where: eq(applicationEvents.applicationId, applicationId),
    orderBy: [desc(applicationEvents.occurredAt), desc(applicationEvents.createdAt)],
  });
  if (latest) {
    await db
      .update(applications)
      .set({ currentStage: latest.stage })
      .where(eq(applications.id, applicationId));
  }
}

const updateEventSchema = z.object({
  eventId: z.uuid(),
  stage: stageSchema,
});

/** needs_review 이벤트 수동 수정 — stage 교정 + 확인 처리 */
export async function updateEventStageAction(formData: FormData): Promise<void> {
  const input = updateEventSchema.parse({
    eventId: formData.get("eventId"),
    stage: formData.get("stage"),
  });

  const db = getDb();
  const updated = await db
    .update(applicationEvents)
    .set({ stage: input.stage, needsReview: false })
    .where(eq(applicationEvents.id, input.eventId))
    .returning({ applicationId: applicationEvents.applicationId });

  const event = updated[0];
  if (event) {
    await refreshCurrentStage(event.applicationId);
  }
  revalidatePath("/");
}

/** needs_review 이벤트 "이상 없음" 확인 처리 (분류 결과 유지) */
export async function confirmEventAction(formData: FormData): Promise<void> {
  const eventId = z.uuid().parse(formData.get("eventId"));

  const db = getDb();
  await db
    .update(applicationEvents)
    .set({ needsReview: false })
    .where(eq(applicationEvents.id, eventId));

  revalidatePath("/");
}
