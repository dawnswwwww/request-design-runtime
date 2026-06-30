import { describe, test, expect } from 'bun:test';
import { discoverPages, selectPages } from '../../src/services/crawler';
import { PageType } from '../../src/utils/classify';

describe('crawler', () => {
  describe('discoverPages', () => {
    test('classifies and filters links by domain', () => {
      const links = [
        { href: 'https://example.com/pricing', text: 'Pricing', context: 'main nav' as const },
        { href: 'https://example.com/features', text: 'Features', context: 'main nav' as const },
        { href: 'https://example.com/privacy', text: 'Privacy', context: 'footer' as const },
        { href: 'https://other.com/page', text: 'Other', context: 'main nav' as const },
        { href: 'https://example.com/file.pdf', text: 'PDF', context: 'in-content' as const },
        { href: 'https://example.com/page#anchor', text: 'Anchor', context: 'in-content' as const },
      ];

      const pages = discoverPages('https://example.com', links);
      const types = pages.map((p) => p.type);

      expect(types).toContain(PageType.PRICING);
      expect(types).toContain(PageType.FEATURES);
      expect(types).not.toContain(PageType.LEGAL);
      expect(pages.every((p) => p.url.startsWith('https://example.com'))).toBe(true);
    });

    test('deduplicates normalized URLs', () => {
      const links = [
        { href: 'https://example.com/pricing?foo=1', text: 'Pricing', context: 'main nav' as const },
        { href: 'https://example.com/pricing#sec', text: 'Pricing', context: 'footer' as const },
      ];

      const pages = discoverPages('https://example.com', links);
      expect(pages.filter((p) => p.type === PageType.PRICING).length).toBe(1);
    });
  });

  describe('selectPages', () => {
    test('always includes root page', () => {
      const pages = [];
      const selected = selectPages('https://example.com', pages, 6);
      expect(selected).toContain('https://example.com');
    });

    test('selects up to 2 high priority pages', () => {
      const pages = [
        { url: 'https://example.com/pricing', type: PageType.PRICING, priority: 'high' as const, context: 'main nav' as const },
        { url: 'https://example.com/plans', type: PageType.PRICING, priority: 'high' as const, context: 'main nav' as const },
        { url: 'https://example.com/features', type: PageType.FEATURES, priority: 'high' as const, context: 'main nav' as const },
      ];
      const selected = selectPages('https://example.com', pages, 6);
      expect(selected.length).toBeLessThanOrEqual(4); // root + up to 2 pricing + 1 features
      expect(selected.filter((u) => u.includes('/pricing') || u.includes('/plans')).length).toBeLessThanOrEqual(2);
    });
  });
});
