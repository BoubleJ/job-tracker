/**
 * HTML 전처리 (스펙 7-3 llm 어댑터 / 7-6 정책 추출기 공유).
 * script/style/noscript/주석 제거 → 본문 텍스트 + 앵커 목록({ text, href }[])만 추출해
 * LLM 입력 토큰을 절약한다. DOM 파서 없이 정규식 기반 (정확성보다 노이즈 제거가 목적).
 */

export interface HtmlLink {
  text: string;
  href: string;
}

export interface PreprocessedHtml {
  text: string;
  links: HtmlLink[];
}

const NOISE_BLOCKS = [
  /<!--[\s\S]*?-->/g,
  /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,
  /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,
  /<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi,
];

export function preprocessHtml(html: string): PreprocessedHtml {
  let cleaned = html;
  for (const pattern of NOISE_BLOCKS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return { text: extractText(cleaned), links: extractLinks(cleaned) };
}

function extractLinks(html: string): HtmlLink[] {
  const links: HtmlLink[] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const attrs = match[1] ?? '';
    const hrefMatch = attrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '').trim();
    const text = collapseWhitespace(decodeEntities(stripTags(match[2] ?? '')));
    if (!href || !text) continue;
    if (href.startsWith('#') || href.toLowerCase().startsWith('javascript:')) continue;
    links.push({ text, href });
  }
  return links;
}

function extractText(html: string): string {
  const withLineBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(
      /<\/(?:p|div|li|tr|h[1-6]|section|article|header|footer|main|ul|ol|table|blockquote|dd|dt)\s*>/gi,
      '\n',
    );
  const decoded = decodeEntities(stripTags(withLineBreaks));
  return decoded
    .split('\n')
    .map((line) => collapseWhitespace(line))
    .filter((line) => line !== '')
    .join('\n');
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const code =
        entity[1]?.toLowerCase() === 'x'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}
