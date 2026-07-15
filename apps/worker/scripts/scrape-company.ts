import { readFileSync } from 'node:fs';
import { and, eq, notInArray } from 'drizzle-orm';
import { companies, createDb, jobPostings, type Company } from '@job-tracker/db';
import { categorySchema, normalizeCompanyName } from '@job-tracker/shared';
import { contentHash } from '@job-tracker/shared/content-hash';
import { z } from 'zod';

/**
 * 수동 공고 적재 (Claude가 직접 스크랩·분류한 결과를 DB에 저장).
 * 프로젝트의 scrape-jobs 적재 로직을 그대로 따르되 LLM 분류만 제외 — category는 입력으로 받는다.
 *
 * 입력 JSON:
 * {
 *   "company": "회사명",
 *   "careersUrl": "https://.../careers",
 *   "closeAbsent": false,              // true면 이번 목록에 없는 해당 회사 open 공고를 closed 처리
 *   "postings": [
 *     { "title": "...", "url": "https://...", "description": "...", "deadline": "2026-08-01", "category": "frontend" }
 *   ]
 * }
 *
 * 실행: pnpm --filter @job-tracker/worker scrape-company <input.json>
 */
const inputSchema = z.object({
  company: z.string().trim().min(1),
  careersUrl: z.string().url(),
  closeAbsent: z.boolean().default(false),
  postings: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        url: z.string().url(),
        description: z.string().nullish(),
        deadline: z.iso.date().nullish(),
        category: categorySchema,
      }),
    )
    .min(1),
});

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) throw new Error('usage: tsx scripts/scrape-company.ts <input.json>');
  const input = inputSchema.parse(JSON.parse(readFileSync(path, 'utf8')));

  const { db, client } = createDb();
  try {
    // 회사 findOrCreate (정규화 이름 기준) + careersUrl 갱신
    const key = normalizeCompanyName(input.company);
    const existing = (await db.select().from(companies)).find(
      (c) => normalizeCompanyName(c.name) === key,
    );
    let company: Company;
    if (existing) {
      company = existing;
      if (existing.careersUrl !== input.careersUrl) {
        await db
          .update(companies)
          .set({ careersUrl: input.careersUrl, scrapeConfig: { url: input.careersUrl } })
          .where(eq(companies.id, existing.id));
        console.log(`  careersUrl 갱신: ${input.company}`);
      }
    } else {
      const [created] = await db
        .insert(companies)
        .values({
          name: input.company,
          careersUrl: input.careersUrl,
          scrapeStrategy: 'llm',
          scrapeConfig: { url: input.careersUrl },
        })
        .returning();
      if (!created) throw new Error(`failed to create company: ${input.company}`);
      company = created;
      console.log(`+ 회사 생성: ${input.company}`);
    }

    const now = new Date();
    const existingHashes = new Set(
      (
        await db
          .select({ h: jobPostings.contentHash })
          .from(jobPostings)
          .where(eq(jobPostings.companyId, company.id))
      ).map((r) => r.h),
    );

    const seen = new Set<string>();
    let added = 0;
    let updated = 0;
    for (const p of input.postings) {
      const hash = contentHash(company.id, p.title, p.url);
      if (seen.has(hash)) continue; // 같은 실행 내 중복 제거
      seen.add(hash);

      if (existingHashes.has(hash)) {
        await db
          .update(jobPostings)
          .set({
            lastSeenAt: now,
            status: 'open',
            deadline: p.deadline ?? null,
            ...(p.description !== undefined && { description: p.description ?? null }),
          })
          .where(eq(jobPostings.contentHash, hash));
        updated++;
      } else {
        await db
          .insert(jobPostings)
          .values({
            companyId: company.id,
            title: p.title,
            category: p.category,
            url: p.url,
            description: p.description ?? null,
            deadline: p.deadline ?? null,
            contentHash: hash,
            status: 'open',
            firstSeenAt: now,
            lastSeenAt: now,
          })
          .onConflictDoNothing();
        added++;
      }
    }

    // 이번 목록에 없는 기존 open 공고 → closed (명시적으로 요청한 경우만)
    let closed = 0;
    if (input.closeAbsent && seen.size > 0) {
      const rows = await db
        .update(jobPostings)
        .set({ status: 'closed' })
        .where(
          and(
            eq(jobPostings.companyId, company.id),
            eq(jobPostings.status, 'open'),
            notInArray(jobPostings.contentHash, [...seen]),
          ),
        )
        .returning({ id: jobPostings.id });
      closed = rows.length;
    }

    console.log(
      `[scrape-company] ${input.company}: added=${added} updated=${updated} closed=${closed} (입력 ${input.postings.length}건)`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[scrape-company] fatal:', error);
  process.exit(1);
});
