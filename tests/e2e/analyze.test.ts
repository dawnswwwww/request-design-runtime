import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { resetDatabase } from '../../src/db';
import { startAnalysis } from '../../src/services/analyzer';
import { createJob, getJob } from '../../src/services/jobs';
import { McpClient } from '../../src/services/mcp';
import { LlmClient } from '../../src/services/llm';
import { mkdir } from 'node:fs/promises';

const FAKE_MCP_PATH = `${import.meta.dir}/../../tests/fixtures/fake-mcp.ts`;

describe('analyze end-to-end', () => {
  const outputDir = `${import.meta.dir}/../../output`;
  let mcp: McpClient;

  beforeAll(async () => {
    process.env.OUTPUT_DIR = outputDir;
    await mkdir(outputDir, { recursive: true });
    await resetDatabase();
    mcp = new McpClient(`bun run ${FAKE_MCP_PATH} mcp`);
  });

  afterAll(async () => {
    await mcp.close();
    await resetDatabase();
  });

  test('completes analysis and writes DESIGN.md with mocked services', async () => {
    const url = 'https://example.com';
    const job = await createJob({ url, outputPath: 'e2e-example/DESIGN.md' });

    const mockLlm = new LlmClient(
      {
        chat: {
          completions: {
            create: async () => ({
              choices: [{ message: { content: '# Example Design System\n\n## Overview\nClean.' } }],
            }),
          },
        },
      } as never,
      { model: 'test' }
    );

    await startAnalysis(job.id, url, 'e2e-example/DESIGN.md', { browser: mcp, llm: mockLlm });

    const completed = await getJob(job.id);
    if (completed?.status === 'failed') {
      console.error('Job failed:', completed.error);
    }
    expect(completed?.status).toBe('completed');
    expect(completed?.result).toMatchObject({
      pagesCrawled: expect.any(Number),
      outputPath: 'e2e-example/DESIGN.md',
    });
  }, 10000);
});
