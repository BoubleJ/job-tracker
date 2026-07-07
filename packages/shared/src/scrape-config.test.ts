import { describe, expect, it } from 'vitest';
import { parseScrapeConfig, scrapeConfigSchema } from './scrape-config';

describe('parseScrapeConfig', () => {
  it('전략에 맞는 설정을 검증하고 discriminant를 합쳐 반환한다', () => {
    expect(parseScrapeConfig('lever', { site: 'kakao' })).toEqual({
      strategy: 'lever',
      site: 'kakao',
    });
    expect(parseScrapeConfig('greenhouse', { boardToken: 'acme' })).toEqual({
      strategy: 'greenhouse',
      boardToken: 'acme',
    });
    expect(
      parseScrapeConfig('llm', { url: 'https://x.com/careers', needsBrowser: true }),
    ).toEqual({ strategy: 'llm', url: 'https://x.com/careers', needsBrowser: true });
  });

  it('공통 policyUrl을 허용한다', () => {
    expect(
      parseScrapeConfig('ninehire', {
        url: 'https://rapportlabs.kr/jobs',
        policyUrl: 'https://rapportlabs.kr/jobs#faq',
      }),
    ).toMatchObject({ policyUrl: 'https://rapportlabs.kr/jobs#faq' });
  });

  it('전략과 설정이 안 맞으면 throw한다', () => {
    expect(() => parseScrapeConfig('lever', { boardToken: 'x' })).toThrow();
    expect(() => parseScrapeConfig('greeting', {})).toThrow();
    expect(() => parseScrapeConfig('llm', { url: 'not-a-url' })).toThrow();
    expect(() => parseScrapeConfig('lever', null)).toThrow();
  });

  it('llm 전략의 needsBrowser는 생략 가능하다', () => {
    expect(parseScrapeConfig('llm', { url: 'https://x.com' })).toEqual({
      strategy: 'llm',
      url: 'https://x.com',
    });
  });
});

describe('scrapeConfigSchema', () => {
  it('알 수 없는 전략을 거부한다', () => {
    const result = scrapeConfigSchema.safeParse({ strategy: 'unknown', url: 'https://x.com' });
    expect(result.success).toBe(false);
  });
});
