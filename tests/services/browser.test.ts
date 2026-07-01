import { describe, test, expect } from 'bun:test';
import { createBrowserClient, getBrowserEngine } from '../../src/services/browser';
import { PlaywrightBrowserClient } from '../../src/services/playwright';
import { McpClient } from '../../src/services/mcp';

describe('browser engine selection', () => {
  test('defaults to lightpanda when env not set', () => {
    delete process.env.BROWSER_ENGINE;
    expect(getBrowserEngine()).toBe('lightpanda');
  });

  test('returns playwright when env set', () => {
    process.env.BROWSER_ENGINE = 'playwright';
    expect(getBrowserEngine()).toBe('playwright');
  });

  test('creates Playwright client', async () => {
    process.env.BROWSER_ENGINE = 'playwright';
    const client = await createBrowserClient();
    expect(client).toBeInstanceOf(PlaywrightBrowserClient);
  });

  test('creates Lightpanda client', async () => {
    process.env.BROWSER_ENGINE = 'lightpanda';
    process.env.LIGHTPANDA_BIN = 'lightpanda';
    const client = await createBrowserClient();
    expect(client).toBeInstanceOf(McpClient);
  });
});
