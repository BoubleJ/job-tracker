"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { companies } from "@job-tracker/db";
import {
  ablyConfigSchema,
  assertNever,
  banksaladConfigSchema,
  dealiciousConfigSchema,
  dunamuConfigSchema,
  greenhouseConfigSchema,
  flexteamConfigSchema,
  greetingConfigSchema,
  jobflexConfigSchema,
  kakaoConfigSchema,
  kakaobankConfigSchema,
  leverConfigSchema,
  llmConfigSchema,
  naverConfigSchema,
  ninehireConfigSchema,
  socarConfigSchema,
  soomgoConfigSchema,
  soopConfigSchema,
  scrapeStrategySchema,
  type ScrapeConfigData,
  type ScrapeStrategy,
} from "@job-tracker/shared";

import { getDb } from "@/lib/db";
import { extractAndSaveCompanyPolicy } from "@/lib/policy";

export type RegisterCompanyState = {
  ok?: boolean;
  error?: string;
};

const registerBaseSchema = z.object({
  name: z.string().trim().min(1, "회사명을 입력하세요"),
  careersUrl: z.url("채용페이지 URL이 올바르지 않습니다"),
  strategy: scrapeStrategySchema,
});

function optionalField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/** 전략별 폼 필드 → scrape_config (전략별 Zod 스키마로 검증, exhaustive) */
function buildScrapeConfig(
  strategy: ScrapeStrategy,
  formData: FormData,
): ScrapeConfigData {
  const policyUrl = optionalField(formData, "policyUrl");
  switch (strategy) {
    case "lever":
      return leverConfigSchema.parse({
        site: optionalField(formData, "site"),
        policyUrl,
      });
    case "greenhouse":
      return greenhouseConfigSchema.parse({
        boardToken: optionalField(formData, "boardToken"),
        policyUrl,
      });
    case "greeting":
      return greetingConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "ninehire":
      return ninehireConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "jobflex":
      return jobflexConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "banksalad":
      // 공고 API가 어댑터에 고정되어 있어 전략별 폼 필드가 없다
      return banksaladConfigSchema.parse({ policyUrl });
    case "naver":
      // 목록 URL의 쿼리(직군 필터)가 그대로 API에 전달되므로 필터가 걸린 URL을 통째로 넣는다
      return naverConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "kakao":
      return kakaoConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "kakaobank":
      // 공고 API가 어댑터에 고정되어 있어 전략별 폼 필드가 없다
      return kakaobankConfigSchema.parse({ policyUrl });
    case "soop":
      return soopConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "soomgo":
      return soomgoConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "socar":
      return socarConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "flexteam":
      return flexteamConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "ably":
      return ablyConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "dunamu":
      return dunamuConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "dealicious":
      return dealiciousConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        policyUrl,
      });
    case "llm":
      return llmConfigSchema.parse({
        url: optionalField(formData, "configUrl"),
        needsBrowser: formData.get("needsBrowser") === "on" ? true : undefined,
        policyUrl,
      });
    default:
      return assertNever(strategy);
  }
}

/** 회사 등록 + 지원 정책 추출 1회 (추출 실패는 등록을 막지 않음) */
export async function registerCompanyAction(
  _prev: RegisterCompanyState,
  formData: FormData,
): Promise<RegisterCompanyState> {
  let companyId: string | undefined;
  try {
    const base = registerBaseSchema.parse({
      name: formData.get("name"),
      careersUrl: formData.get("careersUrl"),
      strategy: formData.get("strategy"),
    });
    const scrapeConfig = buildScrapeConfig(base.strategy, formData);

    const inserted = await getDb()
      .insert(companies)
      .values({
        name: base.name,
        careersUrl: base.careersUrl,
        scrapeStrategy: base.strategy,
        scrapeConfig,
      })
      .returning({ id: companies.id });
    companyId = inserted[0]?.id;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.issues
          .map((issue) =>
            issue.path.length > 0
              ? `${issue.path.join(".")}: ${issue.message}`
              : issue.message,
          )
          .join(" / "),
      };
    }
    return {
      error: error instanceof Error ? error.message : "회사 등록에 실패했습니다",
    };
  }

  // 스펙 5-2/7-6: 등록 시 정책 추출 1회. 실패해도 등록은 유지 (수동 재실행 가능)
  if (companyId) {
    try {
      const outcome = await extractAndSaveCompanyPolicy(companyId);
      if (!outcome.ok) {
        console.error(`[policy] ${companyId} 추출 실패: ${outcome.error}`);
      }
    } catch (error) {
      console.error(`[policy] ${companyId} 추출 실패:`, error);
    }
  }

  revalidatePath("/jobs");
  return { ok: true };
}

/** 회사 그룹 헤더의 "정책 재확인" 버튼 — 정책 추출 수동 재실행 */
export async function refreshCompanyPolicyAction(
  formData: FormData,
): Promise<void> {
  const companyId = z.uuid().parse(formData.get("companyId"));
  try {
    const outcome = await extractAndSaveCompanyPolicy(companyId);
    if (!outcome.ok) {
      console.error(`[policy] ${companyId} 재추출 실패: ${outcome.error}`);
    }
  } catch (error) {
    console.error(`[policy] ${companyId} 재추출 실패:`, error);
  }
  revalidatePath("/jobs");
}
