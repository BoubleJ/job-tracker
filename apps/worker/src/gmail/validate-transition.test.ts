import { describe, expect, it } from 'vitest';
import { validateTransition } from './validate-transition';

describe('validateTransition', () => {
  it('첫 applied 이벤트는 정상', () => {
    expect(validateTransition([], 'applied')).toEqual({
      needsReview: false,
      reasons: [],
    });
  });

  it('applied → document_passed 정상 진행', () => {
    expect(validateTransition(['applied'], 'document_passed').needsReview).toBe(false);
  });

  it('정상 전형 흐름 전체를 통과시킨다', () => {
    expect(
      validateTransition(
        ['applied', 'document_passed', 'interview_1', 'interview_1_passed'],
        'interview_2',
      ).needsReview,
    ).toBe(false);
  });

  it('탈락(rejected) 이후 진행 이벤트를 감지한다', () => {
    const result = validateTransition(['applied', 'rejected'], 'interview_1');
    expect(result.needsReview).toBe(true);
    expect(result.reasons).toContain('progress event after rejection');
  });

  it('서류 탈락(document_rejected) 이후 진행 이벤트를 감지한다', () => {
    const result = validateTransition(['applied', 'document_rejected'], 'document_passed');
    expect(result.needsReview).toBe(true);
    expect(result.reasons).toContain('progress event after rejection');
  });

  it('탈락 이후 재지원(applied)도 플래그한다 — 정상 예외일 수 있으므로 버리지 않고 확인 요청', () => {
    const result = validateTransition(['applied', 'document_rejected'], 'applied');
    expect(result.needsReview).toBe(true);
    // 재지원은 applied 중복 + 탈락 후 진행 둘 다 걸린다
    expect(result.reasons).toHaveLength(2);
  });

  it('탈락 이후 철회(withdrawn)는 진행 이벤트가 아니므로 탈락-후-진행으로 보지 않는다', () => {
    const result = validateTransition(['applied', 'rejected'], 'withdrawn');
    expect(result.needsReview).toBe(false);
  });

  it('같은 stage 중복을 감지한다', () => {
    const result = validateTransition(['applied', 'document_passed'], 'document_passed');
    expect(result.needsReview).toBe(true);
    expect(result.reasons).toContain('duplicate stage event: document_passed');
  });

  it('applied 없이 후속 단계 이벤트를 감지한다', () => {
    const result = validateTransition([], 'interview_1');
    expect(result.needsReview).toBe(true);
    expect(result.reasons).toContain('event without prior applied event');
  });

  it('applied 없이 서류 합격 이벤트도 감지한다', () => {
    expect(validateTransition([], 'document_passed').needsReview).toBe(true);
  });

  it('복수 사유를 모두 수집한다', () => {
    const result = validateTransition(['document_rejected'], 'document_rejected');
    // 중복 + (applied 없음) — 탈락 후 진행은 아님(탈락 이벤트라서)
    expect(result.needsReview).toBe(true);
    expect(result.reasons).toEqual([
      'duplicate stage event: document_rejected',
      'event without prior applied event',
    ]);
  });
});
