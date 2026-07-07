/** fetch 헬퍼 — 실패 시 상태코드를 담아 즉시 throw (조용한 실패 금지). */

const DEFAULT_HEADERS = {
  // 일부 채용페이지가 기본 UA(curl/node)를 차단하므로 브라우저 UA 사용
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
} as const;

export async function fetchText(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(url, { headers: DEFAULT_HEADERS, redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${url}`);
  }
  return res.text();
}

export async function fetchJson(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const res = await fetchImpl(url, {
    headers: { ...DEFAULT_HEADERS, accept: 'application/json' },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${url}`);
  }
  return res.json();
}
