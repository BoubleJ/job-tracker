/**
 * Next.js 기반 채용페이지(greeting, ninehire)의 __NEXT_DATA__ JSON 추출.
 * 구조가 바뀌어 script 태그가 사라지면 조용히 빈 결과를 내지 않고 throw한다.
 */

const NEXT_DATA_PATTERN =
  /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script\s*>/i;

export function extractNextData(html: string): unknown {
  const match = html.match(NEXT_DATA_PATTERN);
  if (!match || !match[1]) {
    throw new Error('__NEXT_DATA__ script tag not found in page HTML');
  }
  return JSON.parse(match[1]) as unknown;
}

/** "2026-07-05T14:59:59.000Z" 같은 타임스탬프에서 ISO 날짜(YYYY-MM-DD)만 취한다. */
export function toIsoDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}
