import { describe, test, expect } from 'bun:test';
import { PlaywrightBrowserClient } from '../../src/services/playwright';

describe('PlaywrightBrowserClient with STEALTH_MODE', () => {
  test('hides navigator.webdriver when stealth is on', async () => {
    const originalStealth = process.env.STEALTH_MODE;
    process.env.STEALTH_MODE = 'true';
    try {
      const client = new PlaywrightBrowserClient();
      await client.start();
      try {
        const fileUrl = `file://${import.meta.dir}/../fixtures/sample-page.html`;
        await client.goto(fileUrl);
        const webdriver = await client.evaluate<unknown>('navigator.webdriver');
        expect(webdriver).toBeFalsy();
      } finally {
        await client.close();
      }
    } finally {
      if (originalStealth === undefined) delete process.env.STEALTH_MODE;
      else process.env.STEALTH_MODE = originalStealth;
    }
  }, 30000);
});
