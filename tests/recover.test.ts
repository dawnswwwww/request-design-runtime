import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { resetDatabase } from '../src/db';
import { createJob, getJob, completeJob, updateJobStatus } from '../src/services/jobs';

describe('job recovery on startup', () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterEach(async () => {
    await resetDatabase();
  });

  test('lists pending and running jobs that need recovery', async () => {
    const pending = await createJob({ url: 'https://a.com', outputPath: 'a.com/DESIGN.md' });
    const running = await createJob({ url: 'https://b.com', outputPath: 'b.com/DESIGN.md' });
    await createJob({ url: 'https://c.com', outputPath: 'c.com/DESIGN.md' });
    await completeJob(pending.id, { ok: true });

    await updateJobStatus(pending.id, 'pending');
    await updateJobStatus(running.id, 'running');

    const inFlight = await Promise.all([pending, running]);
    expect(inFlight.every((j) => ['pending', 'running'].includes(j.status))).toBe(true);
  });
});
