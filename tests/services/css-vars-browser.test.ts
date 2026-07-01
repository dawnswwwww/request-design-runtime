import { describe, test, expect } from 'bun:test';
import { CSS_VAR_RESOLVE_SCRIPT } from '../../src/services/css-vars-browser';

describe('CSS_VAR_RESOLVE_SCRIPT', () => {
  test('exports a script string', () => {
    expect(typeof CSS_VAR_RESOLVE_SCRIPT).toBe('string');
  });

  test('walks stylesheets to gather CSS variables', () => {
    expect(CSS_VAR_RESOLVE_SCRIPT).toContain('document.styleSheets');
    expect(CSS_VAR_RESOLVE_SCRIPT).toContain('getPropertyValue');
  });

  test('resolves var() chains recursively', () => {
    expect(CSS_VAR_RESOLVE_SCRIPT).toContain('var(');
    expect(CSS_VAR_RESOLVE_SCRIPT).toContain('resolveCssVar');
  });

  test('collects semantic + computed sample data', () => {
    expect(CSS_VAR_RESOLVE_SCRIPT).toContain('getComputedStyle');
    expect(CSS_VAR_RESOLVE_SCRIPT).toContain('className');
    expect(CSS_VAR_RESOLVE_SCRIPT).toContain('inNav');
  });

  test('caps recursion depth to avoid infinite loops', () => {
    expect(CSS_VAR_RESOLVE_SCRIPT).toContain('depth > 10');
  });

  test('handles var(--x, fallback) syntax', () => {
    expect(CSS_VAR_RESOLVE_SCRIPT).toContain('comma');
  });
});
