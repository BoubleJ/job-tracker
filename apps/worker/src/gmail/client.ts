import { google, type gmail_v1 } from 'googleapis';

/** Gmail API 인증 (스펙 6장) — OAuth 2.0 refresh token 방식, 스코프 gmail.readonly */

export interface GmailEnv {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/** GMAIL_* env를 검증해 로드한다. 누락 시 어떤 변수가 없는지 명시하고 throw. */
export function loadGmailEnv(
  env: Record<string, string | undefined> = process.env,
): GmailEnv {
  const missing: string[] = [];
  const read = (key: string): string => {
    const value = env[key];
    if (!value) missing.push(key);
    return value ?? '';
  };
  const result: GmailEnv = {
    clientId: read('GMAIL_CLIENT_ID'),
    clientSecret: read('GMAIL_CLIENT_SECRET'),
    refreshToken: read('GMAIL_REFRESH_TOKEN'),
  };
  if (missing.length > 0) {
    throw new Error(`Missing Gmail env vars: ${missing.join(', ')}`);
  }
  return result;
}

export function createGmailClient(env: GmailEnv): gmail_v1.Gmail {
  const auth = new google.auth.OAuth2(env.clientId, env.clientSecret);
  auth.setCredentials({ refresh_token: env.refreshToken });
  return google.gmail({ version: 'v1', auth });
}
