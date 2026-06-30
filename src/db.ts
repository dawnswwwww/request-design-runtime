import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { jobs } from '../drizzle/schema';

const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or TEST_DATABASE_URL is required');
}

export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);

export async function resetDatabase(): Promise<void> {
  await db.delete(jobs);
}
