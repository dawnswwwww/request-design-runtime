import { describe, test, expect } from 'bun:test';
import {
  deriveSpacingScale,
  deriveRadiusScale,
  nameColorByRole,
} from '../../src/utils/tokens';

describe('token utilities', () => {
  describe('deriveSpacingScale', () => {
    test('derives 8px grid scale from observed values', () => {
      const values = ['4px', '8px', '16px', '15px', '24px', '48px', '72px'];
      const scale = deriveSpacingScale(values);
      expect(scale.xs).toBe('4px');
      expect(scale.sm).toBe('8px');
      expect(scale.md).toBe('16px');
      expect(scale.lg).toBe('24px');
      expect(scale.xl).toBe('48px');
    });

    test('returns empty scale when no values', () => {
      const scale = deriveSpacingScale([]);
      expect(Object.keys(scale).length).toBe(0);
    });
  });

  describe('deriveRadiusScale', () => {
    test('derives radius scale from observed values', () => {
      const values = ['0px', '4px', '8px', '16px', '9999px'];
      const scale = deriveRadiusScale(values);
      expect(scale.none).toBe('0px');
      expect(scale.sm).toBe('4px');
      expect(scale.md).toBe('8px');
      expect(scale.lg).toBe('16px');
      expect(scale.full).toBe('9999px');
    });

    test('filters out absurdly large radius values', () => {
      const values = ['4px', '8px', '640px']; // 640 is a layout dimension
      const scale = deriveRadiusScale(values);
      expect(scale.sm).toBe('4px');
      expect(scale.md).toBe('8px');
      expect(scale.xl).toBeUndefined();
    });
  });

  describe('nameColorByRole', () => {
    test('names CTA/action color as primary', () => {
      const result = nameColorByRole('#3B82F6', {
        isCta: true,
        coverage: 0.9,
        isBackground: false,
        isText: false,
      });
      expect(result).toBe('primary');
    });

    test('names background color as surface', () => {
      const result = nameColorByRole('#FFFFFF', {
        isCta: false,
        coverage: 0.2,
        isBackground: true,
        isText: false,
      });
      expect(result).toBe('surface');
    });

    test('names main text color as on-surface', () => {
      const result = nameColorByRole('#1F2937', {
        isCta: false,
        coverage: 0.1,
        isBackground: false,
        isText: true,
      });
      expect(result).toBe('on-surface');
    });

    test('names fallback color as accent', () => {
      const result = nameColorByRole('#8B5CF6', {
        isCta: false,
        coverage: 0.01,
        isBackground: false,
        isText: false,
      });
      expect(result).toBe('accent');
    });
  });
});
