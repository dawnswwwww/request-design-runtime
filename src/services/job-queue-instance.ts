import { JobQueue } from './job-queue';
import { startAnalysis } from './analyzer';
import { updateJobStatus } from './jobs';

const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_JOBS || 2);

export const analysisQueue = new JobQueue({
  concurrency: MAX_CONCURRENT,
  onError: (id, err) => {
    console.error(`[queue] job ${id} failed:`, err.message);
  },
});

export function enqueueAnalysis(
  jobId: string,
  url: string,
  outputPath: string
): Promise<void> {
  // Touch status to "pending" so callers can distinguish from "running".
  void updateJobStatus(jobId, 'pending').catch(() => {});
  return analysisQueue.enqueue(jobId, async () => {
    try {
      await startAnalysis(jobId, url, outputPath);
    } catch (err) {
      // startAnalysis already records failure in DB; just log here.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[queue] startAnalysis for ${jobId} threw:`, message);
    }
  }).then(() => undefined).catch(() => undefined);
}
