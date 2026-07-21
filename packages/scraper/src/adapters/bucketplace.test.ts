import { describe, expect, it } from 'vitest';
import { loadJsonFixture } from '../../test/fixture';
import { parseBucketplaceResponse } from './bucketplace';

// fixture: www.bucketplace.com/page-data/careers/page-data.json 실측 응답에서 3건만 남긴 것 (2026-07)
describe('parseBucketplaceResponse', () => {
  it('page-data.json에서 공고를 뽑고 greeting 정본 URL을 저장한다', () => {
    const postings = parseBucketplaceResponse(
      loadJsonFixture('bucketplace-page-data.json'),
    );

    // 인재풀(isPool)은 실제 공고가 아니라 제외된다
    expect(postings).toEqual([
      {
        title: 'Senior Backend Engineer, Commerce',
        url: 'https://bucketplace.career.greetinghr.com/ko/o/216240',
      },
      {
        // 비개발 공고도 그대로 넘긴다 — 직군 분류는 오케스트레이터 몫
        title: '안전보건관리자',
        url: 'https://bucketplace.career.greetinghr.com/ko/o/214138',
      },
    ]);
  });

  it('isPool이 없어도(구버전 응답) 공고로 취급한다', () => {
    const postings = parseBucketplaceResponse({
      result: {
        data: {
          position: {
            nodes: [{ frontmatter: { name: 'A', recruitUrl: 'https://x/ko/o/1' } }],
          },
        },
      },
    });
    expect(postings).toEqual([{ title: 'A', url: 'https://x/ko/o/1' }]);
  });

  it('응답 구조가 다르면 ZodError로 즉시 실패한다', () => {
    expect(() => parseBucketplaceResponse({ result: { data: {} } })).toThrow();
  });
});
