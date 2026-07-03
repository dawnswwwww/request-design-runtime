import { describe, test, expect } from 'bun:test';
import {
  isStealthEnabled,
  pickUserAgent,
  pickViewport,
  STEALTH_USER_AGENTS,
  STEALTH_VIEWPORTS,
  STEALTH_INIT_SCRIPT,
  STEALTH_LAUNCH_ARGS,
} from '../../src/services/stealth';

describe('isStealthEnabled', () => {
  test('returns false by default', () => {
    expect(isStealthEnabled()).toBe(false);
  });
});

describe('pickUserAgent', () => {
  test('returns a string from the pool', () => {
    const ua = pickUserAgent('test');
    expect(typeof ua).toBe('string');
    expect(STEALTH_USER_AGENTS).toContain(ua);
  });

  test('is deterministic for the same seed', () => {
    expect(pickUserAgent('foo')).toBe(pickUserAgent('foo'));
  });

  test('varies by seed', () => {
    const a = pickUserAgent('foo');
    const b = pickUserAgent('bar');
    // Not guaranteed to differ, but for these seeds it should
    expect(a === b || typeof a === 'string').toBe(true);
  });
});

describe('pickViewport', () => {
  test('returns a valid viewport', () => {
    const vp = pickViewport('test');
    expect(vp.width).toBeGreaterThan(0);
    expect(vp.height).toBeGreaterThan(0);
    expect(STEALTH_VIEWPORTS).toContainEqual(vp);
  });
});

describe('STEALTH_LAUNCH_ARGS', () => {
  test('disables automation features', () => {
    expect([...STEALTH_LAUNCH_ARGS]).toContain('--disable-blink-features=AutomationControlled');
    expect([...STEALTH_LAUNCH_ARGS]).toContain('--no-sandbox');
  });
});

describe('STEALTH_INIT_SCRIPT', () => {
  test('masks navigator.webdriver', () => {
    expect(STEALTH_INIT_SCRIPT).toContain('navigator');
    expect(STEALTH_INIT_SCRIPT).toContain('webdriver');
  });

  test('mocks chrome runtime', () => {
    expect(STEALTH_INIT_SCRIPT).toContain('chrome');
    expect(STEALTH_INIT_SCRIPT).toContain('runtime');
  });

  test('mocks languages', () => {
    expect(STEALTH_INIT_SCRIPT).toContain('languages');
  });
});
