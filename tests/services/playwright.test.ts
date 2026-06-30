import { describe, test, expect } from 'bun:test';
import { PlaywrightBrowserClient } from '../../src/services/playwright';

describe('PlaywrightBrowserClient', () => {
  test('navigates and extracts computed styles', async () => {
    const client = new PlaywrightBrowserClient();
    await client.start();

    try {
      const fileUrl = `file://${import.meta.dir}/../fixtures/sample-page.html`;
      await client.goto(fileUrl);

      const script = `JSON.stringify({
        bodyColor: getComputedStyle(document.body).color,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        btnColor: getComputedStyle(document.querySelector('button')).color,
        btnBg: getComputedStyle(document.querySelector('button')).backgroundColor,
        btnRadius: getComputedStyle(document.querySelector('button')).borderRadius,
      });`;

      const result = await client.evaluate<string>(script);
      const parsed = JSON.parse(result);
      expect(parsed.bodyColor).toBe('rgb(255, 0, 0)');
      expect(parsed.btnBg).toBe('rgb(59, 130, 246)');
      expect(parsed.btnRadius).toBe('8px');
    } finally {
      await client.close();
    }
  }, 15000);

  test('extracts links', async () => {
    const client = new PlaywrightBrowserClient();
    await client.start();

    try {
      const fileUrl = `file://${import.meta.dir}/../fixtures/sample-page.html`;
      await client.goto(fileUrl);
      const links = await client.links();
      expect(links.length).toBe(1);
      expect(links[0].text).toBe('Pricing');
    } finally {
      await client.close();
    }
  }, 15000);

  test('extracts semantic tree', async () => {
    const client = new PlaywrightBrowserClient();
    await client.start();

    try {
      const fileUrl = `file://${import.meta.dir}/../fixtures/sample-page.html`;
      await client.goto(fileUrl);
      const tree = await client.semanticTree();
      expect(Array.isArray(tree)).toBe(true);
    } finally {
      await client.close();
    }
  }, 15000);

  test('extracts interactive elements', async () => {
    const client = new PlaywrightBrowserClient();
    await client.start();

    try {
      const fileUrl = `file://${import.meta.dir}/../fixtures/sample-page.html`;
      await client.goto(fileUrl);
      const elements = await client.interactiveElements();
      expect(Array.isArray(elements)).toBe(true);
      expect((elements as Array<unknown>).length).toBeGreaterThanOrEqual(1);
    } finally {
      await client.close();
    }
  }, 15000);

  test('extracts structured data', async () => {
    const client = new PlaywrightBrowserClient();
    await client.start();

    try {
      const fileUrl = `file://${import.meta.dir}/../fixtures/sample-page.html`;
      await client.goto(fileUrl);
      const data = await client.structuredData();
      expect(typeof data).toBe('object');
    } finally {
      await client.close();
    }
  }, 15000);
});
