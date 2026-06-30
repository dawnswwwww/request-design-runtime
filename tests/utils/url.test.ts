import { describe, test, expect } from 'bun:test';
import {
  normalizeUrl,
  isSameEtldePlusOne,
  isInternalLink,
  extractRootUrl,
  extractDomain,
} from '../../src/utils/url';

describe('url utilities', () => {
  describe('normalizeUrl', () => {
    test('removes query params, hash, and trailing slash', () => {
      expect(normalizeUrl('https://example.com/path/?foo=1#hash')).toBe('https://example.com/path');
    });

    test('keeps root path without trailing slash', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
    });

    test('returns empty string for invalid url', () => {
      expect(normalizeUrl('not-a-url')).toBe('');
    });
  });

  describe('isSameEtldePlusOne', () => {
    test('matches same domain and subdomains', () => {
      expect(isSameEtldePlusOne('https://docs.example.com/page', 'example.com')).toBe(true);
      expect(isSameEtldePlusOne('https://example.com/page', 'example.com')).toBe(true);
    });

    test('rejects different domains', () => {
      expect(isSameEtldePlusOne('https://evil.com/page', 'example.com')).toBe(false);
    });
  });

  describe('isInternalLink', () => {
    test('accepts same-domain https link', () => {
      expect(isInternalLink('https://example.com/page', 'example.com')).toBe(true);
    });

    test('rejects anchors, mailto, javascript, and file links', () => {
      expect(isInternalLink('#section', 'example.com')).toBe(false);
      expect(isInternalLink('mailto:a@b.com', 'example.com')).toBe(false);
      expect(isInternalLink('javascript:void(0)', 'example.com')).toBe(false);
      expect(isInternalLink('https://example.com/file.pdf', 'example.com')).toBe(false);
    });

    test('accepts relative internal link', () => {
      expect(isInternalLink('/pricing', 'example.com')).toBe(true);
    });

    test('rejects external domains', () => {
      expect(isInternalLink('https://other.com/page', 'example.com')).toBe(false);
    });

    test('extractDomain handles subdomains and root domains', () => {
      expect(extractDomain('https://docs.example.com/page')).toBe('example.com');
      expect(extractDomain('https://example.com')).toBe('example.com');
    });

    test('extractRootUrl handles paths', () => {
      expect(extractRootUrl('https://example.com/path/page')).toBe('https://example.com');
    });

    test('returns empty for invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBe('');
      expect(extractRootUrl('not-a-url')).toBe('');
    });
  });

  describe('extractRootUrl', () => {
    test('returns origin with trailing root path removed', () => {
      expect(extractRootUrl('https://example.com/path/page')).toBe('https://example.com');
    });
  });

  describe('extractDomain', () => {
    test('returns eTLD+1 domain', () => {
      expect(extractDomain('https://docs.example.com/path')).toBe('example.com');
    });
  });
});
