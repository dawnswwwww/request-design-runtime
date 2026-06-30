import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { McpClient } from '../../src/services/mcp';

const FAKE_MCP_PATH = `${import.meta.dir}/../fixtures/fake-mcp.ts`;

describe('McpClient', () => {
  let client: McpClient;

  beforeEach(() => {
    client = new McpClient(`bun run ${FAKE_MCP_PATH}`);
  });

  afterEach(async () => {
    await client.close();
  });

  test('starts the MCP process', async () => {
    await client.start();
    expect(client.isRunning()).toBe(true);
  });

  test('goto returns loaded message', async () => {
    await client.start();
    const result = await client.goto('https://example.com');
    expect(result).toContain('loaded https://example.com');
  });

  test('evaluate returns evaluated result', async () => {
    await client.start();
    const result = await client.evaluate('document.title');
    expect(result.result).toContain('evaluated');
  });

  test('links returns array of links', async () => {
    await client.start();
    const result = await client.links();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  test('semantic_tree returns parsed data', async () => {
    await client.start();
    const result = await client.semanticTree();
    expect(Array.isArray(result)).toBe(true);
  });

  test('interactiveElements returns parsed data', async () => {
    await client.start();
    const result = await client.interactiveElements();
    expect(Array.isArray(result)).toBe(true);
  });

  test('structuredData returns parsed data', async () => {
    await client.start();
    const result = await client.structuredData();
    expect(typeof result).toBe('object');
  });

  test('throws on timeout', async () => {
    await client.start();
    // The fake server responds quickly; to test timeout we'd need a slow fake.
    // Instead, test that setting a very low timeout causes rejection on a hanging call.
    client.setTimeout(1);
    await expect(client.goto('https://example.com')).rejects.toThrow();
  });

  test('close stops the process', async () => {
    await client.start();
    await client.close();
    expect(client.isRunning()).toBe(false);
  });
});
