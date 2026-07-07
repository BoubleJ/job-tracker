import { and, eq, notInArray } from 'drizzle-orm';
import { runAdapter, type ScrapeResult } from '@job-tracker/scraper';
import { loadLlmEnv, parseScrapeConfig } from '@job-tracker/shared';
import { contentHash } from '@job-tracker/shared/content-hash';
import { companies, createDb, jobPostings, type Company, type Db } from '@job-tracker/db';
import { classifyCategory, type CategoryLlmOptions } from './classify-category';

/**
 * 공고 스크래핑 오케스트레이터 (스펙 7-4).
 * 1. companies 순회, scrape_strategy로 registry에서 어댑터 실행
 * 2. 신규 공고(content_hash 기준)만 직군 분류(7-7), 비개발은 저장하지 않고 제목을 로그에 남김
 * 3. content_hash 기준 upsert, 기존 공고는 last_seen_at 갱신
 * 4. 이번 실행에서 발견되지 않은 기존 open 공고는 closed 처리
 * 5. 회사 단위 실패 격리 (Promise.allSettled), 실패 요약 출력
 */

interface CompanyReport {
  company: string;
  found: number;
  added: number;
  updated: number;
  closed: number;
  /** 비개발 판정으로 버린 공고 제목들 — 오분류 누락 감지의 유일한 수단 (스펙 7-7) */
  discarded: string[];
  /** 분류 실패로 이번 실행에서 건너뛴 공고 수 (다음 실행에서 재시도됨) */
  classifyFailed: number;
}

async function scrapeCompany(
  db: Db,
  llm: CategoryLlmOptions,
  company: Company,
): Promise<CompanyReport> {
  const config = parseScrapeConfig(company.scrapeStrategy, company.scrapeConfig);
  const results = await runAdapter(config);
  const now = new Date();

  // 같은 실행 내 중복(동일 title+url) 제거
  const byHash = new Map<string, ScrapeResult>();
  for (const result of results) {
    byHash.set(contentHash(company.id, result.title, result.url), result);
  }

  const existingRows = await db
    .select({ contentHash: jobPostings.contentHash })
    .from(jobPostings)
    .where(eq(jobPostings.companyId, company.id));
  const existingHashes = new Set(existingRows.map((row) => row.contentHash));

  const report: CompanyReport = {
    company: company.name,
    found: byHash.size,
    added: 0,
    updated: 0,
    closed: 0,
    discarded: [],
    classifyFailed: 0,
  };

  for (const [hash, result] of byHash) {
    if (existingHashes.has(hash)) {
      // 기존 공고: last_seen_at 갱신 (+재발견 시 open 복귀, 마감일 변동 반영)
      await db
        .update(jobPostings)
        .set({
          lastSeenAt: now,
          status: 'open',
          deadline: result.deadline ?? null,
          ...(result.description !== undefined && { description: result.description }),
        })
        .where(eq(jobPostings.contentHash, hash));
      report.updated++;
      continue;
    }

    // 신규 공고만 직군 분류 (스펙 7-7)
    let category;
    try {
      category = await classifyCategory(result.title, result.description, llm);
    } catch (error) {
      // 분류 실패 시 이번 실행은 건너뛴다 — 저장하지 않았으므로 다음 실행에서 신규로 재시도
      report.classifyFailed++;
      console.error(
        `[scrape-jobs] ${company.name} :: category classification failed for "${result.title}":`,
        error,
      );
      continue;
    }
    if (category === 'non_dev') {
      report.discarded.push(result.title);
      continue;
    }

    await db
      .insert(jobPostings)
      .values({
        companyId: company.id,
        title: result.title,
        category,
        url: result.url,
        description: result.description ?? null,
        deadline: result.deadline ?? null,
        contentHash: hash,
        status: 'open',
        firstSeenAt: now,
        lastSeenAt: now,
      })
      .onConflictDoNothing();
    report.added++;
  }

  // 이번 실행에서 발견되지 않은 기존 open 공고 → closed
  const seenHashes = [...byHash.keys()];
  const closeConditions = [
    eq(jobPostings.companyId, company.id),
    eq(jobPostings.status, 'open'),
    ...(seenHashes.length > 0 ? [notInArray(jobPostings.contentHash, seenHashes)] : []),
  ];
  const closedRows = await db
    .update(jobPostings)
    .set({ status: 'closed' })
    .where(and(...closeConditions))
    .returning({ id: jobPostings.id });
  report.closed = closedRows.length;

  return report;
}

async function main(): Promise<void> {
  const llmEnv = loadLlmEnv();
  const llm: CategoryLlmOptions = {
    model: llmEnv.modelFilter,
    baseUrl: llmEnv.baseUrl,
    apiKey: llmEnv.apiKey,
  };
  const { db, client } = createDb();
  try {
    const allCompanies = await db.select().from(companies);
    // 메일 파이프라인이 자동 생성한 회사(careers_url '')는 스크래핑 설정이 없으므로 제외
    const targets = allCompanies.filter((company) => company.careersUrl !== '');
    const skipped = allCompanies.length - targets.length;
    if (skipped > 0) {
      console.log(`[scrape-jobs] skipped ${skipped} auto-created companies without scrape config`);
    }

    const settled = await Promise.allSettled(
      targets.map((company) => scrapeCompany(db, llm, company)),
    );

    const failures: { company: string; reason: unknown }[] = [];
    for (const [index, outcome] of settled.entries()) {
      const company = targets[index];
      if (!company) continue;
      if (outcome.status === 'rejected') {
        failures.push({ company: company.name, reason: outcome.reason });
        continue;
      }
      const r = outcome.value;
      console.log(
        `[scrape-jobs] ${r.company}: found=${r.found} added=${r.added} updated=${r.updated} closed=${r.closed} discarded=${r.discarded.length} classifyFailed=${r.classifyFailed}`,
      );
      for (const title of r.discarded) {
        console.log(`[scrape-jobs]   discarded non-dev: ${r.company} :: ${title}`);
      }
    }

    if (failures.length > 0) {
      console.error(`[scrape-jobs] ${failures.length}/${targets.length} companies failed:`);
      for (const failure of failures) {
        console.error(`[scrape-jobs]   ${failure.company}:`, failure.reason);
      }
      process.exitCode = 1;
    }
    console.log(
      `[scrape-jobs] done: ${targets.length - failures.length}/${targets.length} companies succeeded`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[scrape-jobs] fatal:', error);
  process.exit(1);
});
