import { chromium as pwChromium, type Browser, type Page, type BrowserContext } from 'playwright';
// Stealth deps are loaded dynamically only when STEALTH_MODE is on,
// to keep them out of the default install path and not affect tests.
import type { BrowserClient, BrowserLink } from './browser';
import {
  isStealthEnabled,
  pickUserAgent,
  pickViewport,
  STEALTH_INIT_SCRIPT,
  STEALTH_LAUNCH_ARGS,
  WARM_UP_URLS,
  HUMAN_BEHAVIOR_SCRIPT,
} from './stealth';

export class PlaywrightBrowserClient implements BrowserClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private context: BrowserContext | null = null;
  private stealth = false;

  async start(): Promise<void> {
    if (this.browser) return;
    this.stealth = isStealthEnabled();

    if (this.stealth) {
      const { chromium: stealthChromium } = await import('playwright-extra');
      const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
      stealthChromium.use(StealthPlugin());

      this.browser = await stealthChromium.launch({
        headless: true,
        args: [...STEALTH_LAUNCH_ARGS],
      });
    } else {
      this.browser = await pwChromium.launch({ headless: true });
    }

    const seed = `browser-${Math.random()}`;
    const viewport = pickViewport(seed);
    this.context = await this.browser.newContext({
      viewport,
      userAgent: pickUserAgent(seed),
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    if (this.stealth) {
      // Layered init script: stealth plugin handles most, we add more.
      await this.context.addInitScript({ content: STEALTH_INIT_SCRIPT });

      // Cookie warming: visit a few benign sites first to accumulate
      // realistic state (NID, AEC, _ga). Real Chrome has these.
      const warmPage = await this.context.newPage();
      try {
        for (const url of WARM_UP_URLS) {
          await warmPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        }
      } catch {
        // warm-up is best-effort
      }
      await warmPage.close();
    }

    this.page = await this.context.newPage();
  }

  async goto(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not started');
    if (this.stealth) {
      // Stealth mode: wait for `load` (not just DOMContentLoaded) so
      // anti-bot JS gets a chance to run. Longer timeout for stealth.
      await this.page.goto(url, { waitUntil: 'load', timeout: 30000 });
      // Human behavior simulation: random mouse move + scroll + dwell.
      await this.page.evaluate(HUMAN_BEHAVIOR_SCRIPT).catch(() => {});
    } else {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }
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
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
