/**
 * Stealth mode for Playwright — applies advanced anti-bot detection bypass.
 *
 * Based on puppeteer-extra-plugin-stealth and a curated set of init scripts.
 * Opt-in: only active when `STEALTH_MODE=true`. The default Playwright
 * client is preserved for compliance-sensitive deployments.
 *
 * ⚠️  WARNING: bypassing bot detection may violate the target site's
 * Terms of Service. Use only on sites you own or have explicit
 * permission to crawl. This is a fragile measure — sites update
 * detection constantly; expect occasional 403/401 even with stealth on.
 */

export const STEALTH_USER_AGENTS = [
  // Recent Chrome on macOS (most common, least flagged)
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7876.55 Safari/537.36',
  // Recent Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7876.55 Safari/537.36',
  // Recent Firefox on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:140.0) Gecko/20100101 Firefox/140.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
];

export const STEALTH_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 2560, height: 1440 },
];

/** Browser launch args that disable automation fingerprints. */
export const STEALTH_LAUNCH_ARGS: readonly string[] = [
  '--disable-blink-features=AutomationControlled',
  '--disable-features=AutomationControlled',
  '--disable-infobars',
  '--disable-dev-shm-usage',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-sandbox',
];

/**
 * Init script that masks the navigator.webdriver and other automation
 * fingerprints. Stealth plugin handles most, but this catches edge cases.
 */
export const STEALTH_INIT_SCRIPT = `
(() => {
  // Hide webdriver
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });

  // Realistic languages
  if (!navigator.languages || navigator.languages.length === 0) {
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  }

  // Mock plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const list = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ];
      list.item = (i) => list[i];
      list.namedItem = (n) => list.find((p) => p.name === n);
      return list;
    },
  });

  // Mock chrome runtime
  window.chrome = window.chrome || { runtime: {} };

  // WebGL vendor (real Chrome uses "Google Inc.")
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (param) {
    if (param === 37445) return 'Intel Inc.';
    if (param === 37446) return 'Intel Iris OpenGL Engine';
    return getParameter.call(this, param);
  };

  // Permissions API
  const originalQuery = window.navigator.permissions?.query;
  if (originalQuery) {
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
  }

  // Connection (typical broadband)
  Object.defineProperty(navigator, 'connection', {
    get: () => ({ effectiveType: '4g', rtt: 50, downlink: 10, saveData: false }),
  });
})();
`;

/** Pick a stable UA based on a hash (so each job gets a consistent identity). */
export function pickUserAgent(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return STEALTH_USER_AGENTS[Math.abs(hash) % STEALTH_USER_AGENTS.length];
}

export function pickViewport(seed: string): { width: number; height: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return STEALTH_VIEWPORTS[Math.abs(hash) % STEALTH_VIEWPORTS.length];
}

export function isStealthEnabled(): boolean {
  return process.env.STEALTH_MODE === 'true' || process.env.STEALTH_MODE === '1';
}
