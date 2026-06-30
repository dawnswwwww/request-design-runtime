import { Hono } from 'hono';
import { z } from 'zod';
import { getJob, createJob } from '../services/jobs';
import { startAnalysis } from '../services/analyzer';
import { extractDomain } from '../utils/url';
import { readFile } from 'node:fs/promises';

export const jobsRoutes = new Hono();

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

  // Start analysis asynchronously; do not await.
  startAnalysis(job.id, url, path).catch((err) => {
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

  const outputDir = process.env.OUTPUT_DIR || './output';
  const fullPath = `${outputDir}/${job.outputPath}`;
  try {
    const content = await readFile(fullPath, 'utf-8');
    return c.text(content, 200, { 'Content-Type': 'text/markdown' });
  } catch {
    return c.json({ error: 'Design file not found' }, 404);
  }
});
