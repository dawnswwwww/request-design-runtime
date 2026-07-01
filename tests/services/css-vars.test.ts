import { describe, test, expect } from 'bun:test';
import { parseCssVariables } from '../../src/services/css-vars';

describe('parseCssVariables', () => {
  test('returns empty map for empty raw', () => {
    const result = parseCssVariables({});
    expect(result.size).toBe(0);
  });

  test('parses simple --name: value', () => {
    const result = parseCssVariables({ '--color-primary': '#3B82F6' });
    expect(result.get('--color-primary')).toBe('#3B82F6');
  });

  test('preserves numeric values', () => {
    const result = parseCssVariables({ '--space-md': '16px', '--radius-sm': '4px' });
    expect(result.get('--space-md')).toBe('16px');
    expect(result.get('--radius-sm')).toBe('4px');
  });

  test('keeps all entries regardless of name prefix', () => {
    const result = parseCssVariables({
      '--color-primary': '#3B82F6',
      '--md': '16px',
      '--unknown-name': 'whatever',
    });
    expect(result.size).toBe(3);
  });
});

describe('inferRoleTokenType', () => {
  test('detects color tokens from name patterns', async () => {
    const { inferRoleTokenType } = await import('../../src/services/css-vars');
    expect(inferRoleTokenType('--color-primary')).toBe('color');
    expect(inferRoleTokenType('--c-primary')).toBe('color');
    expect(inferRoleTokenType('--bg-card')).toBe('color');
  });

  test('detects spacing tokens', async () => {
    const { inferRoleTokenType } = await import('../../src/services/css-vars');
    expect(inferRoleTokenType('--space-md')).toBe('spacing');
    expect(inferRoleTokenType('--spacing-lg')).toBe('spacing');
    expect(inferRoleTokenType('--gap-2')).toBe('spacing');
    expect(inferRoleTokenType('--p-4')).toBe('spacing');
  });

  test('detects radius tokens', async () => {
    const { inferRoleTokenType } = await import('../../src/services/css-vars');
    expect(inferRoleTokenType('--radius-sm')).toBe('radius');
    expect(inferRoleTokenType('--rounded-full')).toBe('radius');
  });

  test('detects typography tokens', async () => {
    const { inferRoleTokenType } = await import('../../src/services/css-vars');
    expect(inferRoleTokenType('--font-sans')).toBe('typography');
    expect(inferRoleTokenType('--text-lg')).toBe('typography');
    expect(inferRoleTokenType('--fs-base')).toBe('typography');
  });

  test('returns undefined for unrecognized names', async () => {
    const { inferRoleTokenType } = await import('../../src/services/css-vars');
    expect(inferRoleTokenType('--inception')).toBeUndefined();
    expect(inferRoleTokenType('--foo-bar-baz')).toBeUndefined();
  });

  test('--text-* is typography when not color-like name', async () => {
    const { inferRoleTokenType } = await import('../../src/services/css-vars');
    expect(inferRoleTokenType('--text-base')).toBe('typography');
  });
});

describe('extractNamedRole', () => {
  test('extracts role like primary / secondary / accent', async () => {
    const { extractNamedRole } = await import('../../src/services/css-vars');
    expect(extractNamedRole('--color-primary')).toBe('primary');
    expect(extractNamedRole('--bg-secondary')).toBe('secondary');
    expect(extractNamedRole('--c-accent-1')).toBe('accent-1');
    expect(extractNamedRole('--color-on-surface')).toBe('on-surface');
  });

  test('returns undefined for non-role-bearing names', async () => {
    const { extractNamedRole } = await import('../../src/services/css-vars');
    expect(extractNamedRole('--space-md')).toBeUndefined();
    expect(extractNamedRole('--inception')).toBeUndefined();
  });
});
