import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * postgres-js 기반 Drizzle 클라이언트 팩토리.
 *
 * - databaseUrl 기본값은 env DATABASE_URL
 * - prepare: false — Supabase transaction pooler(pgbouncer)는 prepared statement를
 *   지원하지 않으므로 기본으로 끈다 (direct 연결에서도 무해)
 * - 워커처럼 프로세스를 종료해야 하는 곳은 client.end()를 호출한다
 */
export function createDb(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
  options: postgres.Options<{}> = {},
) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  const client = postgres(databaseUrl, { prepare: false, ...options });
  const db = drizzle(client, { schema });
  return { db, client };
}

export type DbHandle = ReturnType<typeof createDb>;
export type Db = DbHandle['db'];
