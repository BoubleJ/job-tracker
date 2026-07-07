/**
 * 스크래퍼 공통 타입 (스펙 7-2).
 * 어댑터는 "가져와서 ScrapeResult로 변환"까지만 책임진다 — upsert/closed 처리/
 * 직군 분류는 오케스트레이터(apps/worker/scrape-jobs.ts)의 몫.
 */

export type ScrapeResult = {
  title: string;
  url: string;
  description?: string;
  deadline?: string; // ISO date (YYYY-MM-DD)
};

export type ScrapeAdapter<TConfig> = (config: TConfig) => Promise<ScrapeResult[]>;
