import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { healthRoutes } from '../../src/routes/health';
import { createJobsRoutes } from '../../src/routes/jobs';
import { resetDatabase } from '../../src/db';

function createTestApp() {
  const app = new Hono();
  app.route('/', healthRoutes);
  app.route('/', createJobsRoutes(async () => {}));
  return app;
}

describe('jobs routes', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(async () => {
    app = createTestApp();
    await resetDatabase();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  test('POST /analyze returns job id', async () => {
    const res = await app.request('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.jobId).toBeDefined();
  });

  test('POST /analyze rejects invalid URL', async () => {
    const res = await app.request('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' }),
    });

    expect(res.status).toBe(400);
  });

  test('GET /jobs/:id returns created job', async () => {
    const create = await app.request('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    const { jobId } = await create.json();

    const res = await app.request(`/jobs/${jobId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(jobId);
    expect(body.status).toBe('pending');
  });

  test('GET /jobs/:id returns 404 for missing job', async () => {
    const res = await app.request('/jobs/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  test('GET /jobs/:id/download returns 400 if job not completed', async () => {
    const create = await app.request('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    const { jobId } = await create.json();

    const res = await app.request(`/jobs/${jobId}/download`);
    expect(res.status).toBe(400);
  });

  test('GET /jobs/:id/download returns 404 for missing job', async () => {
    const res = await app.request('/jobs/00000000-0000-0000-0000-000000000000/download');
    expect(res.status).toBe(404);
  });

  test('GET /jobs/:id/download returns file content when completed', async () => {
    const { completeJob } = await import('../../src/services/jobs');
    const { mkdir, writeFile } = await import('node:fs/promises');

    const create = await app.request('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    const { jobId } = await create.json();
    process.env.OUTPUT_DIR = `${import.meta.dir}/../../output`;
    await mkdir(`${process.env.OUTPUT_DIR}/example.com`, { recursive: true });
    await writeFile(`${process.env.OUTPUT_DIR}/example.com/DESIGN.md`, '# Design', 'utf-8');
    await completeJob(jobId, { outputPath: 'example.com/DESIGN.md' });

    const res = await app.request(`/jobs/${jobId}/download`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown');
    const text = await res.text();
    expect(text).toContain('# Design');
  });

  test('GET /health returns ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
