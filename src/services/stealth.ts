/**
 * Stealth mode for Playwright — advanced anti-bot-detection bypass.
 *
 * Based on puppeteer-extra-plugin-stealth + a curated set of init scripts
 * and runtime behavior. Opt-in via STEALTH_MODE env var.
 *
 * Layers (in addition to playwright-extra-plugin-stealth):
 *  1. Realistic UA + viewport pool (rotated per job)
 *  2. Extended init script: deviceMemory, hardwareConcurrency, etc.
 *  3. Cookie warming: visit benign sites first to accumulate NID, AEC
 *  4. Human behavior: random mouse move + scroll on each page
 *  5. Wait for `load` event with longer timeout
 *
 *  ⚠️  WARNING: bypassing bot detection may violate the target site's
 *  Terms of Service. Use only on sites you own or have explicit
 *  permission to crawl. This is a fragile measure — sites update
 *  detection constantly; expect occasional 403/401 even with stealth on.
 */

export const STEALTH_USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7876.55 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7876.55 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:140.0) Gecko/20100101 Firefox/140.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
];

export const STEALTH_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 2560, height: 1440 },
  { width: 1680, height: 1050 },
];

export const STEALTH_LAUNCH_ARGS: readonly string[] = [
  '--disable-blink-features=AutomationControlled',
  '--disable-features=AutomationControlled',
  '--disable-infobars',
  '--disable-dev-shm-usage',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-sandbox',
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
];

/** Sites we visit at browser launch to accumulate realistic cookies. */
export const WARM_UP_URLS: readonly string[] = [
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://www.wikipedia.org/',
];

/**
 * Init script that masks fingerprints. Stealth plugin handles most, but
 * this catches edge cases and adds properties the plugin doesn't.
 */
export const STEALTH_INIT_SCRIPT = `
(() => {
  // Hide webdriver (also done by stealth plugin)
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });

  // Realistic languages
  if (!navigator.languages || navigator.languages.length === 0) {
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  }

  // Mock plugins (with length fix from stealth plugin)
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const list = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1 },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', length: 1 },
      ];
      list.item = (i) => list[i];
      list.namedItem = (n) => list.find((p) => p.name === n);
      list.refresh = () => {};
      return list;
    },
  });

  // Mock mimeTypes
  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => {
      const list = [
        { type: 'application/pdf', suffixes: 'pdf', description: '', enabledPlugin: null },
        { type: 'text/pdf', suffixes: 'pdf', description: '', enabledPlugin: null },
      ];
      list.item = (i) => list[i];
      list.namedItem = (n) => list.find((m) => m.type === n);
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

  // Hardware concurrency (8 cores is the most common in 2024-25)
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8,
    configurable: true,
  });

  // Device memory (8 GB)
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8,
    configurable: true,
  });

  // Max touch points (0 for non-touchscreen)
  Object.defineProperty(navigator, 'maxTouchPoints', {
    get: () => 0,
    configurable: true,
  });

  // Platform
  Object.defineProperty(navigator, 'platform', {
    get: () => 'MacIntel',
    configurable: true,
  });

  // Vendor
  Object.defineProperty(navigator, 'vendor', {
    get: () => 'Google Inc.',
    configurable: true,
  });

  // PDF viewer enabled
  Object.defineProperty(navigator, 'pdfViewerEnabled', {
    get: () => true,
    configurable: true,
  });

  // Notification permission default (real Chrome default state is 'default')
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    Object.defineProperty(Notification, 'permission', { get: () => 'default' });
  }

  // Speech synthesis voices (real Chrome has multiple)
  if (typeof window.speechSynthesis !== 'undefined') {
    const originalGetVoices = window.speechSynthesis.getVoices.bind(window.speechSynthesis);
    window.speechSynthesis.getVoices = function () {
      const real = originalGetVoices();
      if (real.length > 0) return real;
      return [
        { voiceURI: 'Alex', name: 'Alex', lang: 'en-US', localService: true, default: true },
        { voiceURI: 'Samantha', name: 'Samantha', lang: 'en-US', localService: true, default: false },
        { voiceURI: 'Google US English', name: 'Google US English', lang: 'en-US', localService: false, default: false },
      ];
    };
  }

  // Document.hasFocus (real browser returns true when window has focus)
  if (!document.hasFocus()) {
    const originalHasFocus = Document.prototype.hasFocus;
    Document.prototype.hasFocus = function () { return true; };
    void originalHasFocus;
  }

  // iframe contentWindow for cross-origin frames
  const origContentWindow = Object.getOwnPropertyDescriptor(Window.prototype, 'contentWindow');
  // (stealth plugin already handles this)
  void origContentWindow;

  // AudioContext fingerprint noise
  if (typeof AudioContext !== 'undefined') {
    const origGetByteFrequencyData = AudioContext.prototype.getByteFrequencyData;
    if (origGetByteFrequencyData) {
      AudioContext.prototype.getByteFrequencyData = function (array) {
        origGetByteFrequencyData.call(this, array);
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.min(255, array[i] + Math.floor(Math.random() * 3));
        }
        return array;
      };
    }
  }

  // Date.getTime is consistent (no skew)
  const realDate = Date;
  const startTime = realDate.now();
  void realDate;
  void startTime;
})();
`;

/**
 * Simulates human behavior: random mouse moves and scrolls before
 * extraction. This is the single most important anti-bot signal
 * after `webdriver` — a 0ms-dwell session looks robotic.
 */
export const HUMAN_BEHAVIOR_SCRIPT = `
async (function() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;

  // Random mouse move (1-3 moves)
  const moves = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < moves; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h * 0.6);
    const ev = new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true });
    document.dispatchEvent(ev);
    await sleep(50 + Math.random() * 100);
  }

  // Random small scroll (0-2 scrolls)
  const scrolls = Math.floor(Math.random() * 3);
  for (let i = 0; i < scrolls; i++) {
    const dy = 50 + Math.floor(Math.random() * 200);
    window.scrollBy({ top: dy, behavior: 'smooth' });
    await sleep(100 + Math.random() * 200);
  }

  // Wait a realistic 0.5-2 seconds before extraction
  await sleep(500 + Math.random() * 1500);
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
