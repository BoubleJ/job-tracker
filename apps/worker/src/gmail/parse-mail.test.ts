import { describe, expect, it } from 'vitest';
import type { gmail_v1 } from 'googleapis';
import { decodeBase64Url, parseMailContent } from './parse-mail';

const b64url = (text: string): string =>
  Buffer.from(text, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

describe('decodeBase64Url', () => {
  it('base64url(-, _)을 utf-8로 디코딩한다', () => {
    expect(decodeBase64Url(b64url('안녕하세요 <지원자>님'))).toBe('안녕하세요 <지원자>님');
  });
});

describe('parseMailContent', () => {
  it('multipart에서 text/plain을 우선 추출한다', () => {
    const message: gmail_v1.Schema$Message = {
      id: 'msg-1',
      internalDate: '1751700000000',
      payload: {
        mimeType: 'multipart/alternative',
        headers: [
          { name: 'Subject', value: '[회사] 서류 전형 결과 안내' },
          { name: 'From', value: '채용팀 <recruit@example.com>' },
        ],
        parts: [
          {
            mimeType: 'text/plain',
            body: { data: b64url('서류 전형에 합격하셨습니다.') },
          },
          {
            mimeType: 'text/html',
            body: { data: b64url('<p>서류 전형에 <b>합격</b>하셨습니다.</p>') },
          },
        ],
      },
    };
    const parsed = parseMailContent(message);
    expect(parsed.gmailMessageId).toBe('msg-1');
    expect(parsed.subject).toBe('[회사] 서류 전형 결과 안내');
    expect(parsed.from).toBe('채용팀 <recruit@example.com>');
    expect(parsed.body).toBe('서류 전형에 합격하셨습니다.');
    expect(parsed.receivedAt.getTime()).toBe(1751700000000);
  });

  it('text/plain이 없으면 HTML을 스트립해 사용한다', () => {
    const message: gmail_v1.Schema$Message = {
      id: 'msg-2',
      payload: {
        mimeType: 'text/html',
        headers: [{ name: 'subject', value: 'HTML만 있는 메일' }],
        body: {
          data: b64url(
            '<html><style>p{color:red}</style><body><p>면접 안내</p><p>일정: 6월 1일</p></body></html>',
          ),
        },
      },
    };
    const parsed = parseMailContent(message);
    expect(parsed.subject).toBe('HTML만 있는 메일'); // 헤더 이름 대소문자 무시
    expect(parsed.body).toBe('면접 안내\n일정: 6월 1일');
  });

  it('중첩 multipart(예: mixed > alternative)를 재귀 순회한다', () => {
    const message: gmail_v1.Schema$Message = {
      id: 'msg-3',
      payload: {
        mimeType: 'multipart/mixed',
        parts: [
          {
            mimeType: 'multipart/alternative',
            parts: [
              { mimeType: 'text/plain', body: { data: b64url('본문 텍스트') } },
            ],
          },
          { mimeType: 'application/pdf', body: { attachmentId: 'att-1' } },
        ],
      },
    };
    expect(parseMailContent(message).body).toBe('본문 텍스트');
  });

  it('internalDate가 없으면 현재 시각으로 폴백한다', () => {
    const before = Date.now();
    const parsed = parseMailContent({ id: 'msg-4', payload: { mimeType: 'text/plain' } });
    expect(parsed.receivedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(parsed.body).toBe('');
  });
});
