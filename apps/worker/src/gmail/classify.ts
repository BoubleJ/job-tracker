import { z } from 'zod';
import { completeStructured, stageSchema, type LlmEnv } from '@job-tracker/shared';
import type { ParsedMail } from './parse-mail';

/**
 * classifyMail (스펙 6장): 2단계 LLM 분류.
 * 1) 필터 (LLM_MODEL_FILTER, 저가 모델): 채용 전형 관련 메일인가? 아니면 즉시 스킵
 * 2) 추출 (LLM_MODEL_EXTRACT, 큰 모델): 회사명/직무/stage/한 줄 요약/confidence
 * 형식은 Structured Outputs로 API 레벨에서 강제하고 응답은 Zod로 파싱한다 (shared.completeStructured).
 */

const MAX_BODY_CHARS = 6000;

/** confidence가 이 값 미만이면 needs_review로 저장 (스펙 6장) */
export const CONFIDENCE_THRESHOLD = 0.7;

export const mailFilterSchema = z.object({
  isRecruitingRelated: z.boolean(),
});

// Structured Outputs 호환을 위해 optional 대신 nullable 사용 (모든 필드 필수)
export const mailExtractionSchema = z.object({
  company: z.string().min(1),
  position: z.string().nullable(),
  stage: stageSchema,
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});
export type MailExtraction = z.infer<typeof mailExtractionSchema>;

export type MailClassification =
  | { isRecruitingRelated: false }
  | { isRecruitingRelated: true; extraction: MailExtraction };

const FILTER_SYSTEM_PROMPT = `너는 이메일이 "사용자 본인이 지원한 채용 전형 관련 메일"인지 판별하는 분류기다.

isRecruitingRelated = true 인 경우 (전형 진행 관련 메일):
- 지원 접수/접수 확인
- 서류 전형 결과 (합격/불합격)
- 과제 전형·코딩테스트 안내
- 면접 안내, 면접 일정 조율, 면접 결과
- 최종 합격, 처우 협의, 오퍼레터
- 지원 철회 확인

isRecruitingRelated = false 인 경우:
- 채용 공고 홍보, 뉴스레터, 취업 플랫폼의 추천 공고 알림
- 헤드헌터·리크루터의 스카우트/포지션 제안 (본인이 지원한 전형이 아님)
- 그 외 채용 전형과 무관한 모든 메일`;

const EXTRACT_SYSTEM_PROMPT = `너는 채용 전형 메일에서 정보를 추출하는 도구다. 다음 필드를 추출하라.

- company: 전형을 진행하는 회사명. 채용 플랫폼(원티드, 그리팅, 나인하이어 등)이 대신 발송했더라도 실제 지원한 회사명을 쓴다.
- position: 메일에 적힌 지원 직무명. 메일 원문의 표기를 바꾸지 말고 그대로 추출한다 (괄호·하이픈·영문 표기 유지). 직무명이 메일에 없으면 null.
- stage: 이 메일이 알리는 전형 단계. 반드시 아래 값 중 하나:
  - applied: 지원 접수/접수 확인
  - document_passed: 서류 전형 합격
  - document_rejected: 서류 전형 불합격
  - assignment: 과제 전형·코딩테스트 안내
  - interview_1: 1차 면접 안내/일정
  - interview_1_passed: 1차 면접 합격
  - interview_2: 2차/최종 면접 안내
  - final_passed: 최종 합격
  - rejected: 서류 이후 단계(과제/면접 등)의 불합격
  - offer: 처우 협의·오퍼레터
  - withdrawn: 지원 철회 확인
- summary: 메일 내용 한 줄 요약 (한국어).
- confidence: 분류 신뢰도 0~1.

주의: 한국 기업의 불합격 통보는 완곡하다. "아쉽지만", "좋은 결과를 드리지 못하게 되었습니다", "함께하지 못하게 되었습니다", "인연이 닿지 않았습니다" 같은 표현은 불합격 통보다. 어느 단계의 불합격인지(서류 단계면 document_rejected, 그 이후 단계면 rejected)를 문맥으로 구분하라. 확신이 없으면 confidence를 낮게 매겨라.`;

function toUserPrompt(mail: ParsedMail): string {
  return [
    `발신자: ${mail.from}`,
    `제목: ${mail.subject}`,
    '',
    '본문:',
    mail.body.slice(0, MAX_BODY_CHARS),
  ].join('\n');
}

export async function classifyMail(
  mail: ParsedMail,
  llm: LlmEnv,
  fetchImpl?: typeof fetch,
): Promise<MailClassification> {
  const common = {
    baseUrl: llm.baseUrl,
    apiKey: llm.apiKey,
    userPrompt: toUserPrompt(mail),
    temperature: 0,
    ...(fetchImpl && { fetchImpl }),
  };

  const filter = await completeStructured({
    ...common,
    model: llm.modelFilter,
    systemPrompt: FILTER_SYSTEM_PROMPT,
    schema: mailFilterSchema,
    schemaName: 'mail_filter',
  });
  if (!filter.isRecruitingRelated) {
    return { isRecruitingRelated: false };
  }

  const extraction = await completeStructured({
    ...common,
    model: llm.modelExtract,
    systemPrompt: EXTRACT_SYSTEM_PROMPT,
    schema: mailExtractionSchema,
    schemaName: 'mail_extraction',
  });
  return { isRecruitingRelated: true, extraction };
}
