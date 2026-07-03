import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://example.com');
const ua = await page.evaluate(() => navigator.userAgent);
const webdriver = await page.evaluate(() => (navigator as any).webdriver);
console.log('UA:', ua);
console.log('webdriver:', webdriver);
await browser.close();