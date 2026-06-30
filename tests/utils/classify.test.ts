import { describe, test, expect } from 'bun:test';
import { classifyPage, PageType, PagePriority } from '../../src/utils/classify';

describe('classifyPage', () => {
  test('classifies pricing by URL', () => {
    const result = classifyPage('https://example.com/pricing', 'Pricing Plans');
    expect(result.type).toBe(PageType.PRICING);
    expect(result.priority).toBe(PagePriority.HIGH);
  });

  test('classifies features by anchor text', () => {
    const result = classifyPage('https://example.com/product', 'Features');
    expect(result.type).toBe(PageType.FEATURES);
    expect(result.priority).toBe(PagePriority.HIGH);
  });

  test('classifies docs by URL pattern', () => {
    const result = classifyPage('https://example.com/docs/start', 'Docs');
    expect(result.type).toBe(PageType.DOCS);
  });

  test('classifies blog by anchor text', () => {
    const result = classifyPage('https://example.com/news', 'Blog');
    expect(result.type).toBe(PageType.BLOG);
    expect(result.priority).toBe(PagePriority.MEDIUM);
  });

  test('skips auth and legal pages', () => {
    const auth = classifyPage('https://example.com/login', 'Sign in');
    expect(auth.type).toBe(PageType.AUTH);
    expect(auth.priority).toBe(PagePriority.SKIP);

    const legal = classifyPage('https://example.com/privacy', 'Privacy Policy');
    expect(legal.type).toBe(PageType.LEGAL);
    expect(legal.priority).toBe(PagePriority.SKIP);
  });

  test('uses first match in table order when multiple match', () => {
    const result = classifyPage('https://example.com/pricing', 'Product Features');
    expect(result.type).toBe(PageType.PRICING);
  });

  test('returns unknown for unmatched links', () => {
    const result = classifyPage('https://example.com/random', 'Random');
    expect(result.type).toBe(PageType.UNKNOWN);
  });
});
