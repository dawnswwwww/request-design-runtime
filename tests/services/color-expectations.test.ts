import { describe, test, expect } from 'bun:test';
import { colorMatchesRole, getRoleExpectations } from '../../src/services/color-expectations';

describe('colorMatchesRole', () => {
  test('dark blue is a strong primary', () => {
    const result = colorMatchesRole('#1D4ED8', 'primary');
    expect(result.score).toBeGreaterThan(0.7);
  });

  test('very light blue is a weak primary', () => {
    const result = colorMatchesRole('#EBF2FC', 'primary');
    expect(result.score).toBeLessThan(0.4);
  });

  test('white is a strong surface', () => {
    const result = colorMatchesRole('#FFFFFF', 'surface');
    expect(result.score).toBeGreaterThan(0.8);
  });

  test('grayish is a strong muted', () => {
    const result = colorMatchesRole('#6B7280', 'muted');
    expect(result.score).toBeGreaterThan(0.6);
  });

  test('transparent score is 0', () => {
    const result = colorMatchesRole('transparent', 'primary');
    expect(result.score).toBe(0);
  });

  test('returns reasons explaining low scores', () => {
    const result = colorMatchesRole('#EBF2FC', 'primary');
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

describe('getRoleExpectations', () => {
  test('returns range for primary', () => {
    expect(getRoleExpectations('primary').lightnessRange).toEqual([20, 80]);
  });

  test('returns range for surface', () => {
    expect(getRoleExpectations('surface').lightnessRange[0]).toBeGreaterThan(80);
  });

  test('returns null for unknown roles', () => {
    expect(getRoleExpectations('unknown' as never)).toBeNull();
  });
});
