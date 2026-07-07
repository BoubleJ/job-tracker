import { createHash } from 'node:crypto';

/**
 * job_postings.content_hash — 중복 수집 방지용 sha256 (company_id + title + url).
 * 필드 사이에 unit separator(0x1f)를 넣어 필드 경계 이동으로 인한 충돌을 막는다.
 */
export function contentHash(companyId: string, title: string, url: string): string {
  return createHash('sha256')
    .update([companyId, title, url].join('\u001f'), 'utf8')
    .digest('hex');
}
