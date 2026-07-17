/**
 * 공고 본문 HTML → 평문 변환.
 * 자체 채용페이지 어댑터(naver/kakao/kakaobank)는 설명을 HTML 조각으로 받는다 —
 * description은 사람이 읽고 직군 분류 LLM에도 들어가므로 태그를 걷어내고 줄바꿈만 남긴다.
 */

/** description 저장 상한 — 공고 본문은 길어야 수천 자고, 분류 LLM도 앞부분만 쓴다. */
export const MAX_DESCRIPTION_LENGTH = 4000;

const ENTITIES: ReadonlyArray<readonly [RegExp, string]> = [
  [/&nbsp;/g, ' '],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&quot;/g, '"'],
  [/&#0?39;/g, "'"],
  [/&apos;/g, "'"],
  [/&middot;/g, '·'],
  [/&rarr;/g, '→'],
  [/&bull;/g, '•'],
  [/&lsquo;/g, "'"],
  [/&rsquo;/g, "'"],
  [/&ldquo;/g, '"'],
  [/&rdquo;/g, '"'],
  // &amp;는 반드시 마지막 — 먼저 풀면 "&amp;lt;"가 "<"로 잘못 풀린다
  [/&amp;/g, '&'],
];

export function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/(p|div|h[1-6]|li|tr|ul|ol|table|section)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  for (const [pattern, replacement] of ENTITIES) {
    text = text.replace(pattern, replacement);
  }
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_DESCRIPTION_LENGTH);
}
