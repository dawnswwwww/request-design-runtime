import { describe, test, expect } from 'bun:test';
import {
  evalRenderConsistency,
  type RenderCheckResult,
} from '../../src/services/render-consistency';

describe('evalRenderConsistency', () => {
  test('matching css-var value and computed style is consistent', () => {
    const samples = [
      { selector: '.btn', computedBg: '#3B82F6', cssVarResolvesTo: '#3B82F6' },
    ];
    const result = evalRenderConsistency(samples);
    expect(result.matched).toBe(1);
    expect(result.mismatched).toBe(0);
    expect(result.score).toBe(1);
  });

  test('mismatching css-var value reduces score', () => {
    const samples = [
      { selector: '.btn', computedBg: '#3B82F6', cssVarResolvesTo: '#EBF2FC' },
    ];
    const result = evalRenderConsistency(samples);
    expect(result.matched).toBe(0);
    expect(result.mismatched).toBe(1);
    expect(result.score).toBeLessThan(0.5);
  });

  test('mixed samples weighted by match ratio', () => {
    const samples = [
      { selector: '.btn-1', computedBg: '#3B82F6', cssVarResolvesTo: '#3B82F6' },
      { selector: '.btn-2', computedBg: '#3B82F6', cssVarResolvesTo: '#EBF2FC' },
      { selector: '.btn-3', computedBg: '#3B82F6', cssVarResolvesTo: '#3B82F6' },
    ];
    const result = evalRenderConsistency(samples);
    expect(result.matched).toBe(2);
    expect(result.mismatched).toBe(1);
    expect(result.score).toBeCloseTo(2 / 3, 1);
  });

  test('empty samples returns neutral score', () => {
    const result = evalRenderConsistency([]);
    expect(result.score).toBe(0.5);
  });

  test('contains reasons for mismatches', () => {
    const samples = [
      { selector: '.btn', computedBg: '#3B82F6', cssVarResolvesTo: '#EBF2FC' },
    ];
    const result: RenderCheckResult = evalRenderConsistency(samples);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
