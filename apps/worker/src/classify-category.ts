import { z } from 'zod';
import { CATEGORIES, completeStructured, type Category } from '@job-tracker/shared';

/**
 * 직군 분류기 (스펙 7-7): 개발 직군만 수집하기 위한 2단 하이브리드.
 * 1) 키워드 규칙 (순수 함수) — 보수적 설계: 확신 없으면(무매칭·복수 카테고리 매칭)
 *    non_dev가 아니라 LLM 폴백으로 넘긴다
 * 2) LLM 폴백 (LLM_MODEL_FILTER) — 제목에 직군이 드러나지 않는 케이스만 담당
 *
 * 분류 함수는 판정까지만 책임진다 (non_dev 반환 포함). 버릴지는 오케스트레이터의 정책.
 */

export type CategoryDecision = Category | 'non_dev';

type KeywordPattern = string | RegExp; // string은 substring 매칭 (한국어는 \b가 안 통함), RegExp는 word boundary용

const KEYWORD_RULES: ReadonlyArray<{
  category: Category;
  patterns: ReadonlyArray<KeywordPattern>;
}> = [
  {
    category: 'fullstack',
    patterns: ['풀스택', '풀스텍', 'fullstack', 'full stack'],
  },
  {
    category: 'frontend',
    patterns: ['프론트', 'frontend', 'front end', /\bfe\b/],
  },
  {
    category: 'backend',
    patterns: ['백엔드', 'backend', 'back end', '서버 개발', 'server engineer', 'server developer'],
  },
  {
    category: 'mobile',
    patterns: ['모바일', /\bmobile\b/, 'android', '안드로이드', /\bios\b/, 'flutter', 'react native'],
  },
  {
    category: 'devops',
    patterns: [
      'devops',
      '데브옵스',
      /\bsre\b/,
      'site reliability',
      'infra',
      '인프라',
      'platform engineer',
      '플랫폼 엔지니어',
      'cloud engineer',
      '클라우드 엔지니어',
    ],
  },
  {
    category: 'data_ai',
    patterns: [
      'machine learning',
      '머신러닝',
      '딥러닝',
      'deep learning',
      /\bml\b/,
      /\bai\b/,
      /\bllm\b/,
      'mlops',
      'data engineer',
      '데이터 엔지니어',
      'data scientist',
      '데이터 사이언티스트',
      /\bnlp\b/,
      'computer vision',
      '인공지능',
    ],
  },
  {
    category: 'qa',
    patterns: [/\bqa\b/, 'quality assurance', 'quality engineer', 'test engineer', '테스트 엔지니어', /\bsdet\b/],
  },
];

/** 대소문자·하이픈 정규화: 소문자화 + 하이픈류/슬래시 → 공백 ("Front-End" → "front end") */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[-_/·|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 키워드 규칙 1차 분류 (순수 함수).
 * - 풀스택 키워드가 있으면 fullstack 우선 (복수 매칭 우선순위 규칙)
 * - 정확히 하나의 카테고리에만 걸리면 그 카테고리
 * - 무매칭 또는 복수 카테고리 매칭(애매) → null (LLM 폴백으로 — 보수적 설계)
 */
export function classifyByKeywords(title: string): Category | null {
  const normalized = normalizeTitle(title);
  const matched = new Set<Category>();
  for (const rule of KEYWORD_RULES) {
    const hit = rule.patterns.some((pattern) =>
      typeof pattern === 'string' ? normalized.includes(pattern) : pattern.test(normalized),
    );
    if (hit) matched.add(rule.category);
  }
  if (matched.has('fullstack')) return 'fullstack';
  if (matched.size === 1) {
    const [only] = matched;
    return only ?? null;
  }
  return null;
}

const llmCategorySchema = z.object({
  category: z.enum([...CATEGORIES, 'non_dev'] as const),
});

const CATEGORY_SYSTEM_PROMPT = `너는 채용 공고가 어떤 소프트웨어 개발 직군인지 분류하는 도구다. 공고 제목(과 설명)을 보고 category를 반드시 아래 값 중 하나로 답하라.

- frontend: 웹 프론트엔드 개발
- backend: 서버/백엔드 개발
- fullstack: 풀스택 (프론트+백 모두)
- mobile: 모바일 앱 개발 (iOS/Android/크로스플랫폼)
- devops: DevOps/SRE/인프라/플랫폼 엔지니어링
- data_ai: 데이터 엔지니어링/데이터 사이언스/ML·AI
- qa: QA/테스트 엔지니어링
- etc_dev: 개발 직군이 맞지만 위 세부 분류가 애매한 경우 (예: Product Engineer, 임베디드, 보안 엔지니어)
- non_dev: 개발 직군이 아님 (디자인, PM/PO, 마케팅, 영업, 재무, 법무, 인사, CS 등)

주의: 분류가 애매하다고 non_dev로 답하지 마라. 개발 직군인지 아닌지가 기준이고, 개발인데 세부 분류만 애매하면 etc_dev다.`;

export interface CategoryLlmOptions {
  model: string;
  baseUrl: string;
  apiKey: string;
  /** 테스트용 fetch 주입 */
  fetchImpl?: typeof fetch;
}

/**
 * classifyCategory (스펙 7-7): 키워드 규칙 → 안 걸리면 LLM 폴백.
 */
export async function classifyCategory(
  title: string,
  description: string | undefined,
  llm: CategoryLlmOptions,
): Promise<CategoryDecision> {
  const byKeyword = classifyByKeywords(title);
  if (byKeyword) return byKeyword;

  const userPrompt = description
    ? `공고 제목: ${title}\n\n공고 설명:\n${description.slice(0, 3000)}`
    : `공고 제목: ${title}`;
  const result = await completeStructured({
    model: llm.model,
    baseUrl: llm.baseUrl,
    apiKey: llm.apiKey,
    systemPrompt: CATEGORY_SYSTEM_PROMPT,
    userPrompt,
    schema: llmCategorySchema,
    schemaName: 'job_category',
    temperature: 0,
    ...(llm.fetchImpl && { fetchImpl: llm.fetchImpl }),
  });
  return result.category;
}
