/**
 * Playwright 렌더링 폴백 (스펙 7-3 llm 어댑터).
 * playwright는 optional peer dependency — CSR 페이지를 만났을 때만 동적 import하고,
 * 미설치 환경에서는 설치 방법을 담은 명확한 에러를 던진다.
 */

interface MinimalPage {
  goto(url: string, options?: { waitUntil?: 'networkidle'; timeout?: number }): Promise<unknown>;
  content(): Promise<string>;
}

interface MinimalBrowser {
  newPage(): Promise<MinimalPage>;
  close(): Promise<void>;
}

interface PlaywrightModule {
  chromium: { launch(options?: { headless?: boolean }): Promise<MinimalBrowser> };
}

async function importPlaywright(): Promise<PlaywrightModule> {
  // 문자열 변수를 거쳐 import해 타입체커가 미설치 모듈을 해석하지 않게 한다
  const specifier: string = 'playwright';
  try {
    return (await import(specifier)) as PlaywrightModule;
  } catch {
    throw new Error(
      'This page requires browser rendering (CSR), but playwright is not installed. ' +
        'Install it with `pnpm add playwright && pnpm exec playwright install chromium`.',
    );
  }
}

/** Playwright(chromium)로 페이지를 렌더링해 최종 HTML을 반환한다. */
export async function renderWithBrowser(url: string): Promise<string> {
  const playwright = await importPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}
