import { z } from "zod";
import { applyPolicySchema } from "@job-tracker/shared";
import { companies } from "@job-tracker/db";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";

/**
 * 지원 정책(재지원/중복지원) 추출 — @job-tracker/scraper의 policy 모듈 호출 래퍼.
 *
 * 스크래퍼 패키지는 병렬로 구현 중이라 export 이름이 확정되지 않았으므로,
 * 알려진 후보 이름을 순서대로 탐색하고 결과는 Zod로 검증한다 (외부 데이터 경계).
 * 추출 실패는 회사 등록을 막지 않는다 — 호출부에서 best-effort로 처리한다.
 */

/** 스펙 7-6: { reapplyPolicy, duplicateApplyPolicy, note, sourceQuote } */
const policyExtractionSchema = z.looseObject({
  reapplyPolicy: applyPolicySchema,
  duplicateApplyPolicy: applyPolicySchema,
  note: z.string().nullish(),
  sourceQuote: z.string().nullish(),
  sourceUrl: z.string().nullish(),
});

const POLICY_EXPORT_CANDIDATES = [
  "extractCompanyPolicy",
  "extractApplyPolicy",
  "extractPolicy",
] as const;

type PolicyExtractor = (url: string) => Promise<unknown>;

async function loadPolicyExtractor(): Promise<PolicyExtractor | null> {
  const mod = (await import("@job-tracker/scraper")) as unknown as Record<
    string,
    unknown
  >;
  for (const name of POLICY_EXPORT_CANDIDATES) {
    const candidate = mod[name];
    if (typeof candidate === "function") {
      return candidate as PolicyExtractor;
    }
  }
  return null;
}

export type PolicyExtractionOutcome =
  | { ok: true }
  | { ok: false; error: string };

/**
 * 회사의 정책 페이지(scrape_config.policyUrl ?? careers_url)에서 정책을 추출해
 * companies 테이블을 갱신하고 policy_checked_at을 기록한다.
 */
export async function extractAndSaveCompanyPolicy(
  companyId: string,
): Promise<PolicyExtractionOutcome> {
  const db = getDb();
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });
  if (!company) {
    return { ok: false, error: "회사를 찾을 수 없습니다" };
  }

  const config = company.scrapeConfig as { policyUrl?: string } | null;
  const targetUrl = config?.policyUrl ?? company.careersUrl;

  let extractor: PolicyExtractor | null;
  try {
    extractor = await loadPolicyExtractor();
  } catch (error) {
    return {
      ok: false,
      error: `scraper 패키지 로드 실패: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (!extractor) {
    return {
      ok: false,
      error: "@job-tracker/scraper에 정책 추출 모듈이 아직 없습니다",
    };
  }

  const raw = await extractor(targetUrl);
  const parsed = policyExtractionSchema.parse(raw);

  await db
    .update(companies)
    .set({
      reapplyPolicy: parsed.reapplyPolicy,
      duplicateApplyPolicy: parsed.duplicateApplyPolicy,
      policyNote: parsed.note ?? parsed.sourceQuote ?? null,
      policySourceUrl: parsed.sourceUrl ?? targetUrl,
      policyCheckedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  return { ok: true };
}
