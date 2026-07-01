import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  status: text('status').notNull().default('pending'),
  outputPath: text('output_path'),
  progress: integer('progress').notNull().default(0),
  extractedTokens: jsonb('extracted_tokens'),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const designDocs = pgTable('design_docs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  url: text('url').notNull(),
  outputPath: text('output_path').notNull(),
  content: text('content').notNull(),
  livePreviewPath: text('live_preview_path'),
  pagesCrawled: integer('pages_crawled').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type DesignDoc = typeof designDocs.$inferSelect;
export type NewDesignDoc = typeof designDocs.$inferInsert;
