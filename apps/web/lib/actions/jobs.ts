"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { jobPostings } from "@job-tracker/db";
import { categorySchema } from "@job-tracker/shared";

import { getDb } from "@/lib/db";

/** 공고 카테고리 배지 클릭 → 오분류 수동 수정 */
export async function updateJobCategoryAction(
  jobPostingId: string,
  category: string,
): Promise<void> {
  const id = z.uuid().parse(jobPostingId);
  const parsedCategory = categorySchema.parse(category);

  await getDb()
    .update(jobPostings)
    .set({ category: parsedCategory })
    .where(eq(jobPostings.id, id));

  revalidatePath("/jobs");
}
