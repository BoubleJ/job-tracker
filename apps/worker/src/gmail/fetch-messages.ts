import type { gmail_v1 } from 'googleapis';

/**
 * fetchMessages (스펙 6장): gmail_sync_state.history_id 기반 증분 조회.
 * - history_id가 있으면 users.history.list(messageAdded)로 신규 메시지 ID 수집
 * - 최초 실행(또는 history_id 만료 404)이면 최근 N일 검색 쿼리로 폴백
 * - latestHistoryId는 조회 시작 시점의 프로필 historyId — 처리 완료 후 이 값으로 커서를 갱신하면
 *   조회~갱신 사이에 도착한 메일도 다음 실행에서 누락되지 않는다
 */

/** 수신 메일만 대상 — 내가 보낸 메일/임시보관/스팸/휴지통 제외 */
const EXCLUDED_LABELS = new Set(['DRAFT', 'SENT', 'SPAM', 'TRASH']);

export interface FetchMessagesResult {
  messageIds: string[];
  latestHistoryId: string;
}

export async function fetchMessageIds(
  gmail: gmail_v1.Gmail,
  startHistoryId: string | null,
  fallbackDays: number,
): Promise<FetchMessagesResult> {
  const profile = await gmail.users.getProfile({ userId: 'me' });
  const latestHistoryId = profile.data.historyId;
  if (!latestHistoryId) {
    throw new Error('Gmail profile response has no historyId');
  }

  if (startHistoryId) {
    try {
      const messageIds = await listHistoryMessageIds(gmail, startHistoryId);
      return { messageIds, latestHistoryId };
    } catch (error) {
      // 404: history_id가 너무 오래되어 만료됨 → 최근 검색으로 폴백
      if (!isNotFound(error)) throw error;
      console.warn(
        '[sync-gmail] stored history_id expired (404) — falling back to recent search',
      );
    }
  }

  const messageIds = await searchRecentMessageIds(gmail, fallbackDays);
  return { messageIds, latestHistoryId };
}

async function listHistoryMessageIds(
  gmail: gmail_v1.Gmail,
  startHistoryId: string,
): Promise<string[]> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      pageToken,
    });
    for (const history of res.data.history ?? []) {
      for (const added of history.messagesAdded ?? []) {
        const message = added.message;
        if (!message?.id) continue;
        if (message.labelIds?.some((label) => EXCLUDED_LABELS.has(label))) continue;
        ids.add(message.id);
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return [...ids];
}

async function searchRecentMessageIds(
  gmail: gmail_v1.Gmail,
  days: number,
): Promise<string[]> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `newer_than:${days}d -in:sent -in:draft`,
      maxResults: 100,
      pageToken,
    });
    for (const message of res.data.messages ?? []) {
      if (message.id) ids.add(message.id);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return [...ids];
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as {
    code?: number | string;
    status?: number | string;
    response?: { status?: number };
  };
  const status =
    e.response?.status ??
    (typeof e.status === 'number' ? e.status : undefined) ??
    (typeof e.code === 'number' ? e.code : undefined);
  return status === 404;
}
