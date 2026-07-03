import { describe, test, expect } from 'bun:test';
import { PlaywrightBrowserClient } from '../../src/services/playwright';

describe('PlaywrightBrowserClient with STEALTH_MODE', () => {
  async function withStealth<T>(fn: () => Promise<T>): Promise<T> {
    const original = process.env.STEALTH_MODE;
    process.env.STEALTH_MODE = 'true';
    try {
      return await fn();
    } finally {
      if (original === undefined) delete process.env.STEALTH_MODE;
      else process.env.STEALTH_MODE = original;
    }
  }

  test('hides navigator.webdriver when stealth is on', async () => {
    await withStealth(async () => {
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
    });
  }, 30000);

  test('mocks hardwareConcurrency and deviceMemory', async () => {
    await withStealth(async () => {
      const client = new PlaywrightBrowserClient();
      await client.start();
      try {
        const fileUrl = `file://${import.meta.dir}/../fixtures/sample-page.html`;
        await client.goto(fileUrl);
        const hardwareConcurrency = await client.evaluate<number>('navigator.hardwareConcurrency');
        const deviceMemory = await client.evaluate<number>('navigator.deviceMemory');
        expect(hardwareConcurrency).toBe(8);
        expect(deviceMemory).toBe(8);
      } finally {
        await client.close();
      }
    });
  }, 30000);

  test('mocks pdfViewerEnabled', async () => {
    await withStealth(async () => {
      const client = new PlaywrightBrowserClient();
      await client.start();
      try {
        const fileUrl = `file://${import.meta.dir}/../fixtures/sample-page.html`;
        await client.goto(fileUrl);
        const enabled = await client.evaluate<boolean>('navigator.pdfViewerEnabled');
        expect(enabled).toBe(true);
      } finally {
        await client.close();
      }
    });
  }, 30000);

  test('document.hasFocus returns true', async () => {
    await withStealth(async () => {
      const client = new PlaywrightBrowserClient();
      await client.start();
      try {
        const fileUrl = `file://${import.meta.dir}/../fixtures/sample-page.html`;
        await client.goto(fileUrl);
        const hasFocus = await client.evaluate<boolean>('document.hasFocus()');
        expect(hasFocus).toBe(true);
      } finally {
        await client.close();
      }
    });
  }, 30000);
});
