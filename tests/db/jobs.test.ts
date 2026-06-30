import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db, resetDatabase } from '../../src/db';
import { jobs } from '../../drizzle/schema';
import {
  createJob,
  getJob,
  updateJobStatus,
  updateJobProgress,
  completeJob,
  failJob,
} from '../../src/services/jobs';

describe('job service', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  test('creates a job with pending status', async () => {
    const job = await createJob({
      url: 'https://example.com',
      outputPath: 'example/DESIGN.md',
    });

    expect(job).toBeDefined();
    expect(job.url).toBe('https://example.com');
    expect(job.status).toBe('pending');
    expect(job.outputPath).toBe('example/DESIGN.md');
    expect(job.progress).toBe(0);
  });

  test('gets a job by id', async () => {
    const created = await createJob({ url: 'https://test.com' });
    const found = await getJob(created.id);

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
  });

  test('returns null for missing job', async () => {
    const found = await getJob('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  test('updates job status', async () => {
    const created = await createJob({ url: 'https://status.com' });
    const updated = await updateJobStatus(created.id, 'running');

    expect(updated.status).toBe('running');
  });

  test('updates job progress', async () => {
    const created = await createJob({ url: 'https://progress.com' });
    const updated = await updateJobProgress(created.id, 50);

    expect(updated.progress).toBe(50);
  });

  test('completes a job with result', async () => {
    const created = await createJob({ url: 'https://complete.com' });
    const result = { pagesCrawled: 5, outputPath: 'complete/DESIGN.md' };
    const completed = await completeJob(created.id, result);

    expect(completed.status).toBe('completed');
    expect(completed.progress).toBe(100);
    expect(completed.result).toEqual(result);
  });

  test('fails a job with error message', async () => {
    const created = await createJob({ url: 'https://fail.com' });
    const failed = await failJob(created.id, 'timeout');

    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('timeout');
  });
});
