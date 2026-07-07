import { z } from 'zod';
import type { GreetingConfig } from '@job-tracker/shared';
import type { ScrapeAdapter, ScrapeResult } from '../types';
import { fetchText } from '../fetch';
import { extractNextData, toIsoDate } from '../next-data';

/**
 * greeting(그리팅) 어댑터 — 스펙 7-3의 1순위 접근(__NEXT_DATA__)이 실측으로 확인됨.
 *
 * 실측(2026-07, oliveyoung.career.greetinghr.com): 페이지가 react-query dehydratedState를
 * __NEXT_DATA__에 내장하며, queryKey ["openings"]인 쿼리의 state.data에 공고 전체 목록이 들어 있다
 * (203건 전부 SSR 페이로드에 포함 — 별도 내부 API 호출 불필요).
 * 공고 상세 URL은 {origin}/o/{openingId} (실측 200 확인).
 */

const greetingOpeningSchema = z.object({
  openingId: z.number(),
  title: z.string(),
  /** 마감일 — 상시채용이면 null */
  dueDate: z.string().nullish(),
  /** false면 비공개(미게시) 공고 */
  deploy: z.boolean().nullish(),
  openingJobPosition: z
    .object({
      openingJobPositions: z
        .array(
          z.object({
            workspaceJob: z.object({ job: z.string().nullish() }).nullish(),
            workspaceOccupation: z.object({ occupation: z.string().nullish() }).nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
});

const greetingNextDataSchema = z.object({
  props: z.object({
    pageProps: z.object({
      dehydratedState: z.object({
        queries: z.array(
          z.object({
            queryKey: z.unknown(),
            state: z.object({ data: z.unknown() }),
          }),
        ),
      }),
    }),
  }),
});

/** 페이지 HTML에서 공고 목록을 추출한다 (fixture 테스트 대상 순수 함수). */
export function parseGreetingPage(html: string, pageUrl: string): ScrapeResult[] {
  const nextData = greetingNextDataSchema.parse(extractNextData(html));
  const openingsQuery = nextData.props.pageProps.dehydratedState.queries.find(
    (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'openings',
  );
  if (!openingsQuery) {
    throw new Error('greeting: ["openings"] query not found in __NEXT_DATA__');
  }
  const openings = z.array(greetingOpeningSchema).parse(openingsQuery.state.data);
  const origin = new URL(pageUrl).origin;

  return openings
    .filter((opening) => opening.deploy !== false)
    .map((opening) => {
      const jobs = (opening.openingJobPosition?.openingJobPositions ?? [])
        .map((position) => position.workspaceJob?.job)
        .filter((job): job is string => Boolean(job));
      return {
        title: opening.title,
        url: `${origin}/o/${opening.openingId}`,
        ...(jobs.length > 0 && { description: jobs.join(', ') }),
        ...(opening.dueDate && { deadline: toIsoDate(opening.dueDate) }),
      };
    });
}

export const scrapeGreeting: ScrapeAdapter<GreetingConfig> = async (config) => {
  const html = await fetchText(config.url);
  return parseGreetingPage(html, config.url);
};
