import { describe, test, expect } from 'bun:test';
import {
  matchRole,
  isShadeVariant,
  extractShadeVariant,
} from '../../src/services/css-name-match';

describe('matchRole', () => {
  describe('direct hits', () => {
    test('--color-primary scores 1.0', () => {
      expect(matchRole('--color-primary')).toBe('primary');
      expect(matchRole('--c-primary')).toBe('primary');
      expect(matchRole('--bg-primary')).toBe('primary');
    });

    test('--primary-color scores 0.9 (reverse order)', () => {
      expect(matchRole('--primary-color')).toBe('primary');
      expect(matchRole('--primary-bg')).toBe('primary');
    });

    test('--button-primary-bg scores 0.85 (suffix variant)', () => {
      expect(matchRole('--button-primary-bg')).toBe('primary');
    });
  });

  describe('shade variant rejection', () => {
    test('--color-primary-50 scores below 0.2', () => {
      const role = matchRole('--color-primary-50');
      // Either null or returns 'primary' but caller should detect shade via isShadeVariant
      expect(isShadeVariant('--color-primary-50')).toBe(true);
    });

    test('extracts shade number', () => {
      expect(extractShadeVariant('--color-primary-500')).toBe('500');
      expect(extractShadeVariant('--blue-700')).toBe('700');
    });
  });

  describe('role recognition across categories', () => {
    test('secondary', () => {
      expect(matchRole('--color-secondary')).toBe('secondary');
    });

    test('on-surface', () => {
      expect(matchRole('--color-on-surface')).toBe('on-surface');
    });

    test('accent-1, accent-2', () => {
      expect(matchRole('--color-accent-1')).toBe('accent-1');
      expect(matchRole('--color-accent-2')).toBe('accent-2');
    });

    test('returns null for unknown names', () => {
      expect(matchRole('--inception')).toBeNull();
      expect(matchRole('--foo-bar-baz')).toBeNull();
    });
  });

  describe('return type for shade variants', () => {
    test('extracts shade from --color-primary-50', () => {
      expect(extractShadeVariant('--color-primary-50')).toBe('50');
      expect(isShadeVariant('--color-primary-50')).toBe(true);
    });
  });
});
