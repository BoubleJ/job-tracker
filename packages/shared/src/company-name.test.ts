import { describe, expect, it } from 'vitest';
import { normalizeCompanyName } from './company-name';

describe('normalizeCompanyName', () => {
  it('한국 법인격 표기를 제거한다', () => {
    expect(normalizeCompanyName('(주)카카오')).toBe('카카오');
    expect(normalizeCompanyName('㈜네이버')).toBe('네이버');
    expect(normalizeCompanyName('주식회사 비바리퍼블리카')).toBe('비바리퍼블리카');
    expect(normalizeCompanyName('유한회사 어딘가')).toBe('어딘가');
  });

  it('영문 법인격 접미사를 제거하고 소문자화한다', () => {
    expect(normalizeCompanyName('Rapport Labs Inc.')).toBe('rapportlabs');
    expect(normalizeCompanyName('Toss Co., Ltd')).toBe('toss');
    expect(normalizeCompanyName('DUNAMU')).toBe('dunamu');
  });

  it('공백을 모두 제거한다', () => {
    expect(normalizeCompanyName('  당근 마켓  ')).toBe('당근마켓');
  });

  it('단어 내부의 법인격 유사 문자열은 건드리지 않는다', () => {
    expect(normalizeCompanyName('Coupang')).toBe('coupang');
    expect(normalizeCompanyName('Incode')).toBe('incode');
  });

  it('같은 회사의 서로 다른 표기가 동일한 값으로 정규화된다', () => {
    expect(normalizeCompanyName('(주) 카카오')).toBe(normalizeCompanyName('카카오'));
  });
});
