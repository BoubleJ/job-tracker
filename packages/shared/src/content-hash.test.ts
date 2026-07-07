import { describe, expect, it } from 'vitest';
import { contentHash } from './content-hash';

describe('contentHash', () => {
  it('같은 입력에는 항상 같은 64자리 hex를 반환한다', () => {
    const a = contentHash('company-1', 'Frontend Engineer', 'https://x.com/1');
    const b = contentHash('company-1', 'Frontend Engineer', 'https://x.com/1');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('입력이 하나라도 다르면 다른 해시를 반환한다', () => {
    const base = contentHash('c1', 'title', 'url');
    expect(contentHash('c2', 'title', 'url')).not.toBe(base);
    expect(contentHash('c1', 'title2', 'url')).not.toBe(base);
    expect(contentHash('c1', 'title', 'url2')).not.toBe(base);
  });

  it('필드 경계가 달라지면 다른 해시가 된다 (구분자 검증)', () => {
    expect(contentHash('a', 'bc', 'd')).not.toBe(contentHash('ab', 'c', 'd'));
    expect(contentHash('a', 'b', 'cd')).not.toBe(contentHash('a', 'bc', 'd'));
  });
});
