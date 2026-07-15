/**
 * 데이터 보존 기준 계산 (순수 함수).
 * 지원일(appliedAt) 기준 N개월이 지난 지원건을 자동 삭제하기 위한 기준일을 구한다.
 */

/**
 * 보존 기준일 — `today`로부터 `months`개월 이전 날짜('YYYY-MM-DD').
 * 이 날짜 '미만'(<)의 appliedAt을 가진 지원건이 삭제 대상이다.
 * 월말 오버플로는 대상 월의 말일로 clamp (예: 3/31 - 1개월 → 2/28).
 * TZ 영향을 없애기 위해 UTC 기준으로 순수 계산한다 (입력은 이미 KST 기준 날짜 문자열).
 */
export function retentionCutoff(today: string, months: number): string {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 - months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  const yy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(target.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
