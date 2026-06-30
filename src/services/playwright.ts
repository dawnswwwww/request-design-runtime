import { chromium, type Browser, type Page } from 'playwright';
import type { BrowserClient, BrowserLink } from './browser';

export class PlaywrightBrowserClient implements BrowserClient {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async start(): Promise<void> {
    if (this.browser) return;
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
  }

  async goto(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not started');
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  async evaluate<T = unknown>(script: string): Promise<T> {
    if (!this.page) throw new Error('Browser not started');
    return this.page.evaluate(script) as Promise<T>;
  }

  async links(): Promise<BrowserLink[]> {
    if (!this.page) throw new Error('Browser not started');
    return this.page.$$eval('a[href]', (anchors) =>
      anchors.map((a) => ({
        href: a.getAttribute('href') || '',
        text: a.textContent?.trim() || '',
      }))
    );
  }

  async semanticTree(): Promise<unknown> {
    if (!this.page) throw new Error('Browser not started');
    return this.page.$$eval('h1, h2, h3, nav, header, footer, main', (elements) =>
      elements.map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 100) || '',
      }))
    );
  }

  async interactiveElements(): Promise<unknown> {
    if (!this.page) throw new Error('Browser not started');
    return this.page.$$eval('button, a, input, select, textarea, [role="button"]', (elements) =>
      elements.map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 50) || '',
        role: el.getAttribute('role') || undefined,
      }))
    );
  }

  async structuredData(): Promise<unknown> {
    if (!this.page) throw new Error('Browser not started');
    const jsonLd = await this.page.$$eval('script[type="application/ld+json"]', (scripts) =>
      scripts
        .map((s) => {
          try {
            return JSON.parse(s.textContent || '{}');
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    );
    const openGraph = await this.page.$$eval('meta[property^="og:"]', (metas) =>
      Object.fromEntries(
        metas
          .map((m) => [m.getAttribute('property'), m.getAttribute('content')])
          .filter(([k]) => k)
      )
    );
    return { jsonLd, openGraph };
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
