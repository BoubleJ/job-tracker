/**
 * 회사명 정규화 (스펙 6장 matchApplication):
 * 소문자화 → 법인격 표기 제거(한/영) → 구두점·공백 제거.
 * 메일에서 추출한 회사명과 companies.name을 같은 함수로 정규화해 대조한다.
 */

const KOREAN_LEGAL_ENTITY = /㈜|\(주\)|\(유\)|주식회사|유한회사|유한책임회사/g;
const ENGLISH_LEGAL_ENTITY =
  /\b(?:inc|corp|corporation|co|ltd|llc|limited|company)\b\.?/g;

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(KOREAN_LEGAL_ENTITY, '')
    .replace(ENGLISH_LEGAL_ENTITY, '')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, '');
}
