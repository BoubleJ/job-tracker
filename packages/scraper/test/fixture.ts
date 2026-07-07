import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** test/fixtures의 실측 응답 파일을 읽는다. */
export function loadFixture(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
    'utf-8',
  );
}

export function loadJsonFixture(name: string): unknown {
  return JSON.parse(loadFixture(name)) as unknown;
}
