import { describe, test, expect } from 'bun:test';
import {
  mapCssVarToRole,
  mapCssVarToShadeVariant,
  recognizeColorRoles,
} from '../../src/services/css-vars-role-map';

describe('mapCssVarToRole', () => {
  test('maps --color-primary to primary', () => {
    expect(mapCssVarToRole('--color-primary')).toBe('primary');
  });

  test('maps --color-on-primary', () => {
    expect(mapCssVarToRole('--color-on-primary')).toBe('on-primary');
  });

  test('maps --dsw-alias-brand-primary', () => {
    expect(mapCssVarToRole('--dsw-alias-brand-primary')).toBe('primary');
  });

  test('maps --dsw-alias-state-error-primary to error', () => {
    expect(mapCssVarToRole('--dsw-alias-state-error-primary')).toBe('error');
  });

  test('maps --dsw-alias-state-success-primary to success', () => {
    expect(mapCssVarToRole('--dsw-alias-state-success-primary')).toBe('success');
  });

  test('maps --dsw-alias-state-warn-primary to warning', () => {
    expect(mapCssVarToRole('--dsw-alias-state-warn-primary')).toBe('warning');
  });

  test('maps --color-on-surface', () => {
    expect(mapCssVarToRole('--color-on-surface')).toBe('on-surface');
  });

  test('maps --color-error to error', () => {
    expect(mapCssVarToRole('--color-error')).toBe('error');
  });

  test('returns null for unknown name', () => {
    expect(mapCssVarToRole('--weird-thing')).toBeNull();
  });
});

describe('mapCssVarToShadeVariant', () => {
  test('extracts shade-50 as base for tints', () => {
    const result = mapCssVarToShadeVariant('--color-primary-50', 'primary');
    expect(result).toEqual({ role: 'primary-tint', shadeNumber: 50 });
  });

  test('extracts shade-700 as shade', () => {
    const result = mapCssVarToShadeVariant('--color-primary-700', 'primary');
    expect(result).toEqual({ role: 'primary-shade', shadeNumber: 700 });
  });

  test('returns null for non-shade variant', () => {
    expect(mapCssVarToShadeVariant('--color-primary', 'primary')).toBeNull();
  });
});

describe('recognizeColorRoles', () => {
  test('produces a role→value map for a flat CSS vars dictionary', () => {
    const vars: Record<string, string> = {
      '--color-primary': '#3B82F6',
      '--color-on-primary': '#FFFFFF',
      '--color-secondary': '#64748B',
      '--color-error': '#EF4444',
      '--color-success': '#10B981',
      '--color-warning': '#F59E0B',
      '--color-surface': '#FFFFFF',
      '--color-on-surface': '#0F172A',
    };
    const result = recognizeColorRoles(vars);
    expect(result.primary).toBe('#3B82F6');
    expect(result['on-primary']).toBe('#FFFFFF');
    expect(result.secondary).toBe('#64748B');
    expect(result.error).toBe('#EF4444');
    expect(result.success).toBe('#10B981');
    expect(result.warning).toBe('#F59E0B');
    expect(result.surface).toBe('#FFFFFF');
    expect(result['on-surface']).toBe('#0F172A');
  });

  test('handles --dsw-alias-* prefixed names', () => {
    const vars: Record<string, string> = {
      '--dsw-alias-brand-primary': '#5686fe',
      '--dsw-alias-button-primary-fill': '#5686fe',
      '--dsw-alias-state-error-primary': '#f25a5a',
    };
    const result = recognizeColorRoles(vars);
    expect(result.primary).toBe('#5686fe');
    expect(result.error).toBe('#f25a5a');
  });

  test('skips non-color values', () => {
    const vars: Record<string, string> = {
      '--color-primary': '#3B82F6',
      '--color-secondary': 'transparent',
      '--weird-thing': 'whatever',
    };
    const result = recognizeColorRoles(vars);
    expect(result.primary).toBe('#3B82F6');
    expect(result.secondary).toBeUndefined();
  });
});