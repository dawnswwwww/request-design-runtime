import { describe, test, expect } from 'bun:test';
import { BROWSER_RENDER_CHECK_SCRIPT } from '../../src/services/render-consistency';

describe('BROWSER_RENDER_CHECK_SCRIPT', () => {
  test('runs in the page context', () => {
    expect(typeof BROWSER_RENDER_CHECK_SCRIPT).toBe('string');
  });

  test('targets buttons and CTA links', () => {
    expect(BROWSER_RENDER_CHECK_SCRIPT).toContain("querySelectorAll('button");
    expect(BROWSER_RENDER_CHECK_SCRIPT).toContain('[class*="cta"]');
  });

  test('records computedBg and cssVarResolvesTo', () => {
    expect(BROWSER_RENDER_CHECK_SCRIPT).toContain('computedBg');
    expect(BROWSER_RENDER_CHECK_SCRIPT).toContain('cssVarResolvesTo');
  });

  test('caps sample count to 5', () => {
    expect(BROWSER_RENDER_CHECK_SCRIPT).toContain('>= 5');
  });

  test('returns a JSON string', () => {
    expect(BROWSER_RENDER_CHECK_SCRIPT).toContain('JSON.stringify');
  });
});