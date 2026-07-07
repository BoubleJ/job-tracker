/** 표시용 날짜 포맷터 (서버 렌더링 전용 — Asia/Seoul 고정) */

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});

/** date 컬럼('YYYY-MM-DD' 문자열) → 'YYYY.MM.DD' (타임존 변환 없이 그대로) */
export function formatDate(date: string | Date): string {
  if (typeof date === "string") {
    return date.replaceAll("-", ".");
  }
  return dateFormatter.format(date).replaceAll(". ", ".").replace(/\.$/, "");
}

/** timestamptz → 'YYYY.MM.DD. HH:mm' (KST) */
export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

/** 오늘 날짜의 'YYYY-MM-DD' (KST) — date input 기본값용 */
export function todayIsoDate(now: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return formatted;
}
