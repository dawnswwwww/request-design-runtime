import { eq } from 'drizzle-orm';
import { db } from '../db';
import { jobs, type Job, type NewJob } from '../../drizzle/schema';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export async function createJob(input: Pick<NewJob, 'url' | 'outputPath'>): Promise<Job> {
  const [job] = await db
    .insert(jobs)
    .values({
      url: input.url,
      outputPath: input.outputPath,
      status: 'pending',
      progress: 0,
    })
    .returning();
  return job;
}

export async function getJob(id: string): Promise<Job | null> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
  return job ?? null;
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<Job> {
  const [job] = await db
    .update(jobs)
    .set({ status, updatedAt: new Date() })
    .where(eq(jobs.id, id))
    .returning();
  if (!job) throw new Error(`Job not found: ${id}`);
  return job;
}

export async function updateJobProgress(id: string, progress: number): Promise<Job> {
  const [job] = await db
    .update(jobs)
    .set({ progress, updatedAt: new Date() })
    .where(eq(jobs.id, id))
    .returning();
  if (!job) throw new Error(`Job not found: ${id}`);
  return job;
}

export async function completeJob(id: string, result: Record<string, unknown>): Promise<Job> {
  const [job] = await db
    .update(jobs)
    .set({ status: 'completed', progress: 100, result, updatedAt: new Date() })
    .where(eq(jobs.id, id))
    .returning();
  if (!job) throw new Error(`Job not found: ${id}`);
  return job;
}

export async function failJob(id: string, error: string): Promise<Job> {
  const [job] = await db
    .update(jobs)
    .set({ status: 'failed', error, updatedAt: new Date() })
    .where(eq(jobs.id, id))
    .returning();
  if (!job) throw new Error(`Job not found: ${id}`);
  return job;
}
