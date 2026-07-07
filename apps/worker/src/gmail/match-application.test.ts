import { describe, expect, it } from 'vitest';
import {
  decideMatch,
  normalizePosition,
  type ApplicationCandidate,
} from './match-application';

const app = (
  id: string,
  position: string,
  currentStage: ApplicationCandidate['currentStage'],
): ApplicationCandidate => ({ id, position, currentStage });

describe('normalizePosition', () => {
  it('공백 정리 수준만 정규화한다 (괄호·하이픈은 그대로)', () => {
    expect(normalizePosition('  Frontend   Engineer ')).toBe('Frontend Engineer');
    expect(normalizePosition('백엔드 개발자 (Node.js)')).toBe('백엔드 개발자 (Node.js)');
    expect(normalizePosition('Front-End\tEngineer')).toBe('Front-End Engineer');
  });
});

describe('decideMatch', () => {
  it('① 직무명 정확 일치가 최우선 — 진행 건이 여러 개여도 즉시 확정', () => {
    const candidates = [
      app('a', 'Frontend Engineer', 'applied'),
      app('b', 'Backend Engineer', 'interview_1'),
    ];
    expect(decideMatch(candidates, 'Backend Engineer', 'document_passed')).toEqual({
      kind: 'existing',
      applicationId: 'b',
    });
  });

  it('① 직무명 비교는 공백 정리 후 수행한다', () => {
    const candidates = [app('a', 'Frontend  Engineer', 'applied')];
    expect(decideMatch(candidates, ' Frontend Engineer', 'rejected')).toEqual({
      kind: 'existing',
      applicationId: 'a',
    });
  });

  it('① 탈락한 지원 건이라도 직무명이 일치하면 연결한다 (재지원 감지는 validateTransition 몫)', () => {
    const candidates = [app('a', 'Frontend Engineer', 'rejected')];
    expect(decideMatch(candidates, 'Frontend Engineer', 'applied')).toEqual({
      kind: 'existing',
      applicationId: 'a',
    });
  });

  it('지원 접수(applied) 메일인데 일치하는 기존 건이 없으면 신규 생성', () => {
    const candidates = [app('a', 'Backend Engineer', 'applied')];
    expect(decideMatch(candidates, 'Frontend Engineer', 'applied')).toEqual({ kind: 'new' });
    expect(decideMatch([], null, 'applied')).toEqual({ kind: 'new' });
  });

  it('② 직무명 미기재 시 진행 중 지원 건이 1개뿐이면 그대로 연결', () => {
    const candidates = [
      app('a', 'Frontend Engineer', 'interview_1'),
      app('b', 'Backend Engineer', 'rejected'),
      app('c', 'Data Engineer', 'withdrawn'),
    ];
    expect(decideMatch(candidates, null, 'interview_1_passed')).toEqual({
      kind: 'existing',
      applicationId: 'a',
    });
  });

  it('② 직무명 불일치여도 단일 진행 건이면 폴백 연결', () => {
    const candidates = [app('a', 'FE 개발자', 'document_passed')];
    expect(decideMatch(candidates, '프론트엔드 개발자', 'interview_1')).toEqual({
      kind: 'existing',
      applicationId: 'a',
    });
  });

  it('③ 진행 중 복수 건인데 직무로 확정 안 되면 review', () => {
    const candidates = [
      app('a', 'Frontend Engineer', 'applied'),
      app('b', 'Backend Engineer', 'applied'),
    ];
    expect(decideMatch(candidates, null, 'document_passed')).toEqual({ kind: 'review' });
    expect(decideMatch(candidates, 'Data Engineer', 'document_passed')).toEqual({
      kind: 'review',
    });
  });

  it('③ 진행 중 건이 0개면 (applied가 아닌 이상) review', () => {
    expect(decideMatch([], null, 'document_passed')).toEqual({ kind: 'review' });
    const candidates = [app('a', 'Frontend Engineer', 'rejected')];
    expect(decideMatch(candidates, null, 'interview_1')).toEqual({ kind: 'review' });
  });
});
