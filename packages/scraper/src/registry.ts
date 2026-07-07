import {
  assertNever,
  type ScrapeConfig,
  type ScrapeStrategy,
} from '@job-tracker/shared';
import type { ScrapeAdapter, ScrapeResult } from './types';
import { scrapeGreeting } from './adapters/greeting';
import { scrapeNinehire } from './adapters/ninehire';
import { scrapeLever } from './adapters/lever';
import { scrapeGreenhouse } from './adapters/greenhouse';
import { scrapeLlm } from './adapters/llm';

/**
 * 전략명 → 어댑터 매핑 (스펙 7-2).
 * satisfies로 scrape_strategy enum과 키가 1:1로 대응함을 컴파일 타임에 보장한다
 * — 전략이 추가되면 여기서 컴파일 에러가 난다.
 */
export const adapters = {
  greeting: scrapeGreeting,
  ninehire: scrapeNinehire,
  lever: scrapeLever,
  greenhouse: scrapeGreenhouse,
  llm: scrapeLlm,
} as const satisfies {
  [S in ScrapeStrategy]: ScrapeAdapter<Extract<ScrapeConfig, { strategy: S }>>;
};

/**
 * 검증된 ScrapeConfig(shared parseScrapeConfig 결과)를 해당 어댑터로 디스패치한다.
 * 오케스트레이터용 헬퍼 — switch + assertNever로 exhaustive 처리.
 */
export function runAdapter(config: ScrapeConfig): Promise<ScrapeResult[]> {
  switch (config.strategy) {
    case 'greeting':
      return adapters.greeting(config);
    case 'ninehire':
      return adapters.ninehire(config);
    case 'lever':
      return adapters.lever(config);
    case 'greenhouse':
      return adapters.greenhouse(config);
    case 'llm':
      return adapters.llm(config);
    default:
      return assertNever(config);
  }
}
