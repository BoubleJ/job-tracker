import { z } from 'zod';

/**
 * 도메인 enum의 단일 소스.
 * packages/db의 pgEnum이 이 상수 배열을 그대로 사용한다 (db → shared 단방향 의존).
 */

export const STAGES = [
  'applied',
  'document_passed',
  'document_rejected',
  'assignment',
  'interview_1',
  'interview_1_passed',
  'interview_2',
  'final_passed',
  'rejected',
  'offer',
  'withdrawn',
] as const;
export type Stage = (typeof STAGES)[number];
export const stageSchema = z.enum(STAGES);

export const CATEGORIES = [
  'frontend',
  'backend',
  'fullstack',
  'mobile',
  'devops',
  'data_ai',
  'qa',
  'game',
  'etc_dev',
] as const;
export type Category = (typeof CATEGORIES)[number];
export const categorySchema = z.enum(CATEGORIES);

export const SCRAPE_STRATEGIES = [
  'greeting',
  'ninehire',
  'lever',
  'greenhouse',
  'jobflex',
  /** 뱅크샐러드 자체 채용페이지 (greeting 백엔드지만 채용페이지가 꺼져 있어 전용 API가 필요) */
  'banksalad',
  /** 네이버 계열 자체 채용페이지 (recruit.navercorp.com / recruit.snowcorp.com — 같은 rcrt 플랫폼) */
  'naver',
  /** 카카오 자체 채용페이지 (careers.kakao.com) */
  'kakao',
  /** 카카오뱅크 자체 채용페이지 (recruit.kakaobank.com) */
  'kakaobank',
  'llm',
] as const;
export type ScrapeStrategy = (typeof SCRAPE_STRATEGIES)[number];
export const scrapeStrategySchema = z.enum(SCRAPE_STRATEGIES);

/** 재지원(reapply_policy)·중복지원(duplicate_apply_policy) 공용 값 집합 */
export const APPLY_POLICIES = [
  'allowed',
  'not_allowed',
  'conditional',
  'unknown',
] as const;
export type ApplyPolicy = (typeof APPLY_POLICIES)[number];
export const applyPolicySchema = z.enum(APPLY_POLICIES);

export const JOB_POSTING_STATUSES = ['open', 'closed'] as const;
export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[number];
export const jobPostingStatusSchema = z.enum(JOB_POSTING_STATUSES);

/** switch 문 exhaustive check 헬퍼 — default 분기에서 호출하면 누락이 컴파일 에러로 드러난다 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
