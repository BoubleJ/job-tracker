import { z } from 'zod';
import type { ScrapeStrategy } from './enums';

/**
 * scrape_config (companies.scrape_config jsonb) — 전략별 Discriminated Union.
 *
 * DB에는 전략이 별도 컬럼(scrape_strategy)에 있으므로 jsonb에는 discriminant 없이
 * 전략별 설정만 저장한다 (ScrapeConfigData). 코드에서 전략별 분기가 필요할 때는
 * parseScrapeConfig(strategy, config)로 discriminant가 합쳐진 ScrapeConfig를 얻어
 * switch + assertNever로 exhaustive 처리한다.
 */

/** 공통: 지원 정책(재지원/중복지원) 안내가 careers_url이 아닌 다른 페이지에 있을 때 지정 */
const policyUrlField = z.url().optional();

export const leverConfigSchema = z.object({
  /** lever slug — https://api.lever.co/v0/postings/{site}?mode=json */
  site: z.string().min(1),
  policyUrl: policyUrlField,
});
export type LeverConfig = z.infer<typeof leverConfigSchema>;

export const greenhouseConfigSchema = z.object({
  /** https://boards-api.greenhouse.io/v1/boards/{boardToken}/jobs */
  boardToken: z.string().min(1),
  policyUrl: policyUrlField,
});
export type GreenhouseConfig = z.infer<typeof greenhouseConfigSchema>;

export const greetingConfigSchema = z.object({
  /** 그리팅 채용페이지 URL (커스텀 도메인 포함) */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type GreetingConfig = z.infer<typeof greetingConfigSchema>;

export const ninehireConfigSchema = z.object({
  /** 나인하이어 채용페이지 URL (커스텀 도메인 포함) */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type NinehireConfig = z.infer<typeof ninehireConfigSchema>;

export const jobflexConfigSchema = z.object({
  /** JOBFLEX(마이다스 recruiter.co.kr) 채용페이지 URL — 호스트가 API prefix 헤더로 쓰인다 */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type JobflexConfig = z.infer<typeof jobflexConfigSchema>;

export const banksaladConfigSchema = z.object({
  /** 공고 목록 API가 어댑터에 고정되어 있어 별도 설정이 없다 (careers_url은 사람이 보는 용도) */
  policyUrl: policyUrlField,
});
export type BanksaladConfig = z.infer<typeof banksaladConfigSchema>;

export const naverConfigSchema = z.object({
  /**
   * 네이버 계열 채용 목록 URL — 쿼리스트링의 직군 필터(subJobCdArr 등)가 그대로 API에 전달되므로
   * 필터가 걸린 URL을 통째로 넣는다. 호스트로 계열사가 갈린다 (navercorp / snowcorp).
   */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type NaverConfig = z.infer<typeof naverConfigSchema>;

export const kakaoConfigSchema = z.object({
  /** careers.kakao.com 채용 목록 URL — 쿼리(part/company 등)가 그대로 API 파라미터로 쓰인다 */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type KakaoConfig = z.infer<typeof kakaoConfigSchema>;

export const kakaobankConfigSchema = z.object({
  /** 공고 목록 API가 어댑터에 고정되어 있어 별도 설정이 없다 (careers_url은 사람이 보는 용도) */
  policyUrl: policyUrlField,
});
export type KakaobankConfig = z.infer<typeof kakaobankConfigSchema>;

export const soopConfigSchema = z.object({
  /** SOOP 채용 목록 URL (recruit_list.php) — 목록 HTML에 전 공고가 들어 있다 */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type SoopConfig = z.infer<typeof soopConfigSchema>;

export const soomgoConfigSchema = z.object({
  /** 숨고 자체 채용페이지 URL (www.soomgo.team/career) — 공고 목록의 유일한 신뢰 출처 */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type SoomgoConfig = z.infer<typeof soomgoConfigSchema>;

export const socarConfigSchema = z.object({
  /** 쏘카 자체 채용페이지 URL (www.socarcorp.kr/careers/jobs) — 공고 목록의 유일한 출처 */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type SocarConfig = z.infer<typeof socarConfigSchema>;

export const flexteamConfigSchema = z.object({
  /** 플렉스팀 채용페이지 URL (flex.careers.team/job-descriptions) — 공고 링크의 origin·customerIdHash 출처 */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type FlexteamConfig = z.infer<typeof flexteamConfigSchema>;

export const ablyConfigSchema = z.object({
  /** 에이블리 자체 채용페이지 URL (ably.team/recruit) — __NEXT_DATA__ recruits의 유일한 출처 */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type AblyConfig = z.infer<typeof ablyConfigSchema>;

export const dunamuConfigSchema = z.object({
  /** 두나무 채용 목록 URL (www.dunamu.com/careers/jobs) — __NEXT_DATA__ articles의 출처 */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type DunamuConfig = z.infer<typeof dunamuConfigSchema>;

export const dealiciousConfigSchema = z.object({
  /** 딜리셔스 자체 채용페이지 URL (www.dealicious.kr/career) — 호스트가 /api/openings의 origin이 된다 */
  url: z.url(),
  policyUrl: policyUrlField,
});
export type DealiciousConfig = z.infer<typeof dealiciousConfigSchema>;

export const llmConfigSchema = z.object({
  /** 자체 채용페이지 URL */
  url: z.url(),
  /** CSR 페이지라 Playwright 렌더링이 필요한지 캐시 */
  needsBrowser: z.boolean().optional(),
  policyUrl: policyUrlField,
});
export type LlmConfig = z.infer<typeof llmConfigSchema>;

/** DB jsonb 컬럼에 저장되는 형태 (discriminant 없음 — 전략은 scrape_strategy 컬럼) */
export type ScrapeConfigData =
  | LeverConfig
  | GreenhouseConfig
  | GreetingConfig
  | NinehireConfig
  | JobflexConfig
  | BanksaladConfig
  | NaverConfig
  | KakaoConfig
  | KakaobankConfig
  | SoopConfig
  | SoomgoConfig
  | SocarConfig
  | FlexteamConfig
  | AblyConfig
  | DunamuConfig
  | DealiciousConfig
  | LlmConfig;

export const scrapeConfigSchema = z.discriminatedUnion('strategy', [
  leverConfigSchema.extend({ strategy: z.literal('lever') }),
  greenhouseConfigSchema.extend({ strategy: z.literal('greenhouse') }),
  greetingConfigSchema.extend({ strategy: z.literal('greeting') }),
  ninehireConfigSchema.extend({ strategy: z.literal('ninehire') }),
  jobflexConfigSchema.extend({ strategy: z.literal('jobflex') }),
  banksaladConfigSchema.extend({ strategy: z.literal('banksalad') }),
  naverConfigSchema.extend({ strategy: z.literal('naver') }),
  kakaoConfigSchema.extend({ strategy: z.literal('kakao') }),
  kakaobankConfigSchema.extend({ strategy: z.literal('kakaobank') }),
  soopConfigSchema.extend({ strategy: z.literal('soop') }),
  soomgoConfigSchema.extend({ strategy: z.literal('soomgo') }),
  socarConfigSchema.extend({ strategy: z.literal('socar') }),
  flexteamConfigSchema.extend({ strategy: z.literal('flexteam') }),
  ablyConfigSchema.extend({ strategy: z.literal('ably') }),
  dunamuConfigSchema.extend({ strategy: z.literal('dunamu') }),
  dealiciousConfigSchema.extend({ strategy: z.literal('dealicious') }),
  llmConfigSchema.extend({ strategy: z.literal('llm') }),
]);
export type ScrapeConfig = z.infer<typeof scrapeConfigSchema>;

// 컴파일 타임 exhaustive check: 유니온이 SCRAPE_STRATEGIES 전체를 커버해야 한다
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
true satisfies AssertEqual<ScrapeConfig['strategy'], ScrapeStrategy>;

/**
 * DB에서 읽은 (scrape_strategy, scrape_config) 쌍을 검증하고
 * discriminant가 포함된 ScrapeConfig로 변환한다. 검증 실패 시 ZodError를 던진다.
 */
export function parseScrapeConfig(
  strategy: ScrapeStrategy,
  config: unknown,
): ScrapeConfig {
  const data = typeof config === 'object' && config !== null ? config : {};
  return scrapeConfigSchema.parse({ ...data, strategy });
}
