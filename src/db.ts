import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { jobs } from '../drizzle/schema';

const rawUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

if (!rawUrl) {
  throw new Error('DATABASE_URL or TEST_DATABASE_URL is required');
}

// Some Supabase pooler URLs have raw `@` and `:` in the password that confuse
// the postgres-js driver. url-encode the credentials to be safe.
function normalizeUrl(input: string): string {
  try {
    const u = new URL(input);
    const user = encodeURIComponent(decodeURIComponent(u.username));
    const pass = encodeURIComponent(decodeURIComponent(u.password));
    return `postgresql://${user}:${pass}@${u.host}${u.pathname}${u.search}`;
  } catch {
    return input;
  }
}

const connectionString = normalizeUrl(rawUrl);

export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);

export async function resetDatabase(): Promise<void> {
  await db.delete(jobs);
}
