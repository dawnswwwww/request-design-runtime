import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { resetDatabase } from '../../src/db';
import { createJob } from '../../src/services/jobs';
import {
  createDesignDoc,
  getDesignDocByJobId,
  updateDesignDocPreviewPath,
} from '../../src/services/design-docs';

describe('design docs service', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(async () => {
    await resetDatabase();
  });

  test('creates design doc linked to job', async () => {
    const job = await createJob({ url: 'https://example.com', outputPath: 'example.com/DESIGN.md' });
    const doc = await createDesignDoc({
      jobId: job.id,
      domain: 'example.com',
      url: 'https://example.com',
      outputPath: 'example.com/DESIGN.md',
      content: '# Design',
      pagesCrawled: 3,
    });

    expect(doc.jobId).toBe(job.id);
    expect(doc.domain).toBe('example.com');
    expect(doc.content).toBe('# Design');
    expect(doc.pagesCrawled).toBe(3);
  });

  test('gets design doc by job id', async () => {
    const job = await createJob({ url: 'https://example.com', outputPath: 'example.com/DESIGN.md' });
    await createDesignDoc({
      jobId: job.id,
      domain: 'example.com',
      url: 'https://example.com',
      outputPath: 'example.com/DESIGN.md',
      content: '# Design',
      pagesCrawled: 1,
    });

    const found = await getDesignDocByJobId(job.id);
    expect(found).toBeDefined();
    expect(found?.content).toBe('# Design');
  });

  test('returns null when design doc not found', async () => {
    const found = await getDesignDocByJobId('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  test('updates live preview path', async () => {
    const job = await createJob({ url: 'https://example.com', outputPath: 'example.com/DESIGN.md' });
    const doc = await createDesignDoc({
      jobId: job.id,
      domain: 'example.com',
      url: 'https://example.com',
      outputPath: 'example.com/DESIGN.md',
      content: '# Design',
      pagesCrawled: 1,
    });

    const updated = await updateDesignDocPreviewPath(job.id, 'example.com/preview.html');
    expect(updated.livePreviewPath).toBe('example.com/preview.html');
    expect(updated.id).toBe(doc.id);
  });
});
