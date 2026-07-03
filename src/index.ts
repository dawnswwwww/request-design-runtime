import { app } from './app';
import { db } from './db';
import { jobs } from '../drizzle/schema';
import { eq, inArray } from 'drizzle-orm';
import { enqueueAnalysis } from './services/job-queue-instance';

const port = Number(process.env.PORT) || 3000;

// On startup, re-enqueue any jobs that were running or pending when the
// server was restarted (e.g. after an OOM). This protects against losing
// work-in-progress.
async function recoverInFlightJobs(): Promise<void> {
  try {
    const inFlight = await db
      .select()
      .from(jobs)
      .where(inArray(jobs.status, ['pending', 'running']));

    if (inFlight.length === 0) return;

    console.log(`[startup] re-enqueuing ${inFlight.length} in-flight job(s)`);
    for (const job of inFlight) {
      if (!job.outputPath) continue;
      // Reset status to pending so the queue picks it up cleanly.
      await db
        .update(jobs)
        .set({ status: 'pending', progress: 0, error: null, updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      enqueueAnalysis(job.id, job.url, job.outputPath);
    }
  } catch (err) {
    console.error('[startup] failed to recover jobs:', err);
  }
}

recoverInFlightJobs();

export default {
  port,
  fetch: app.fetch,
};
