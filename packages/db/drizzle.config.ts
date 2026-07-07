import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // generate는 접속 정보가 필요 없다. push/pull 시에만 DATABASE_URL이 필요하다.
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
