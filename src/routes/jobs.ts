import { Hono } from 'hono';
import { z } from 'zod';
import { getJob, createJob } from '../services/jobs';
import { startAnalysis } from '../services/analyzer';
import { getDesignDocByJobId } from '../services/design-docs';
import { extractDomain } from '../utils/url';

export function createJobsRoutes(
  analyze: typeof startAnalysis = startAnalysis
): Hono {
  const jobsRoutes = new Hono();

  const analyzeSchema = z.object({
    url: z.string().url(),
    outputPath: z.string().optional(),
  });

  jobsRoutes.post('/analyze', async (c) => {
    const body = await c.req.json();
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.format() }, 400);
    }

    const { url, outputPath } = parsed.data;
    const domain = extractDomain(url);
    const path = outputPath || `${domain}/DESIGN.md`;

    const job = await createJob({ url, outputPath: path });

    analyze(job.id, url, path).catch((err) => {
      console.error('Failed to start analysis:', err);
    });

    return c.json({ jobId: job.id }, 202);
  });

  jobsRoutes.get('/jobs/:id', async (c) => {
    const id = c.req.param('id');
    const job = await getJob(id);
    if (!job) return c.json({ error: 'Job not found' }, 404);
    return c.json(job);
  });

  jobsRoutes.get('/jobs/:id/download', async (c) => {
    const id = c.req.param('id');
    const job = await getJob(id);
    if (!job) return c.json({ error: 'Job not found' }, 404);
    if (job.status !== 'completed' || !job.outputPath) {
      return c.json({ error: 'Design file not ready' }, 400);
    }

    const doc = await getDesignDocByJobId(id);
    if (doc?.content) {
      return c.text(doc.content, 200, { 'Content-Type': 'text/markdown' });
    }

    return c.json({ error: 'Design file not found in database' }, 404);
  });

  return jobsRoutes;
}

export const jobsRoutes = createJobsRoutes();
