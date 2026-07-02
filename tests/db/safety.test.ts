import { describe, test, expect } from 'bun:test';
import { db } from '../../src/db';
import { sql } from 'drizzle-orm';

describe('test environment safety', () => {
  test('resetDatabase must use TEST_DATABASE_URL not production', async () => {
    // This is a regression test: bun test auto-loads .env, so DATABASE_URL
    // points to production. We must never let tests touch production data.
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.TEST_DATABASE_URL).toBeDefined();

    // Verify we connected to the test DB by name.
    const result = await db.execute(sql`SELECT current_database() as db`) as unknown as Array<{ db: string }>;
    const dbName = result[0]?.db;
    expect(dbName).toBe('request_design_test');
  });
});
