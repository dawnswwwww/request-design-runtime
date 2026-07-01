import { describe, test, expect } from 'bun:test';
import {
  scoreVariableAcrossPages,
  scoreVariable,
  isHighConfidence,
} from '../../src/services/css-confidence';

describe('scoreVariable', () => {
  test('combines name score and color match score', () => {
    const result = scoreVariable('--color-primary', '#1D4ED8', 'primary');
    expect(result.score).toBeGreaterThan(0.7);
  });

  test('light blue named primary scores low', () => {
    const result = scoreVariable('--color-primary-50', '#EBF2FC', 'primary');
    expect(result.score).toBeLessThan(0.2);
  });

  test('light blue named as primary-step (shade) flags as shade, not base', () => {
    const result = scoreVariable('--color-primary-50', '#EBF2FC', 'primary');
    expect(result.factors.shade).toBe(true);
  });

  test('returns reasons for low scores', () => {
    const result = scoreVariable('--random-name', '#1D4ED8', 'primary');
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

describe('scoreVariableAcrossPages', () => {
  test('consistent across pages increases score', () => {
    const result = scoreVariableAcrossPages('--color-primary', ['#1D4ED8', '#1D4ED8', '#1D4ED8'], 'primary');
    expect(result.score).toBeGreaterThan(0.7);
  });

  test('inconsistent across pages lowers score', () => {
    const result = scoreVariableAcrossPages('--color-primary', ['#1D4ED8', '#EBF2FC', '#000000'], 'primary');
    expect(result.score).toBeLessThan(0.5);
  });

  test('same value across all pages is treated as consistent', () => {
    const result = scoreVariableAcrossPages(
      '--color-primary',
      ['#3B82F6', '#3B82F6'],
      'primary',
    );
    expect(result.factors.consistent).toBeGreaterThan(0.9);
  });
});

describe('isHighConfidence', () => {
  test('returns true for score >= 0.7', () => {
    expect(isHighConfidence({ score: 0.8, factors: { consistent: 1, nameMatch: 1, colorMatch: 1, shade: false }, reasons: [] })).toBe(true);
  });

  test('returns false for low scores', () => {
    expect(isHighConfidence({ score: 0.3, factors: { consistent: 1, nameMatch: 1, colorMatch: 1, shade: false }, reasons: [] })).toBe(false);
  });
});
