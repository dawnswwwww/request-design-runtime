import { describe, test, expect } from 'bun:test';
import { extractComponents } from '../../src/services/components';
import { aggregateByRole } from '../../src/services/role-aggregator';
import type { EnrichedSample } from '../../src/services/role-aggregator';

const sample = (role: 'button-primary' | 'button-secondary' | 'input' | 'card' | 'nav-link' | 'body' | 'heading', text: string, overrides: Partial<EnrichedSample['style']> = {}): EnrichedSample => ({
  semantic: {
    tag: 'BUTTON',
    role: null,
    inNav: false,
    inHeader: false,
    inMain: true,
    isInteractive: true,
    looksLikeButton: true,
    looksLikePrimary: role === 'button-primary',
    looksLikeCard: role === 'card',
    looksLikeLink: role === 'nav-link',
    textSample: text,
    role2: role,
  },
  style: {
    color: '#FFFFFF',
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    borderRadius: '8px',
    fontFamily: 'Inter',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.5',
    letterSpacing: 'normal',
    padding: '12px 24px',
    boxShadow: 'none',
    ...overrides,
  },
});

describe('extractComponents', () => {
  test('returns empty map for empty samples', () => {
    const result = extractComponents([]);
    expect(Object.keys(result).length).toBe(0);
  });

  test('extracts button-primary from samples', () => {
    const samples = [sample('button-primary', 'Get Started')];
    const result = extractComponents(samples);
    expect(result['button-primary']).toBeDefined();
    expect(result['button-primary'].backgroundColor).toBe('#3B82F6');
    expect(result['button-primary'].color).toBe('#FFFFFF');
    expect(result['button-primary'].borderRadius).toBe('8px');
  });

  test('captures padding and typography in components', () => {
    const samples = [sample('button-primary', 'Submit', { padding: '8px 16px', fontSize: '14px' })];
    const result = extractComponents(samples);
    expect(result['button-primary'].padding).toBe('8px 16px');
    expect(result['button-primary'].fontSize).toBe('14px');
  });

  test('records provenance text samples', () => {
    const samples = [
      sample('button-primary', 'Get Started'),
      sample('button-primary', 'Sign Up'),
      sample('button-primary', 'Subscribe'),
    ];
    const result = extractComponents(samples);
    expect(result['button-primary'].sources).toContain('Get Started');
    expect(result['button-primary'].sources).toContain('Sign Up');
  });

  test('skips card with no samples', () => {
    const samples = [sample('button-primary', 'X')];
    const result = extractComponents(samples);
    expect(result['card']).toBeUndefined();
  });
});

describe('extractComponents via aggregateByRole', () => {
  test('uses aggregated styles when multiple samples present', () => {
    const samples = [
      sample('button-primary', 'A', { backgroundColor: '#3B82F6' }),
      sample('button-primary', 'B', { backgroundColor: '#3B82F6' }),
      sample('button-primary', 'C', { backgroundColor: '#1D4ED8' }),
    ];
    const agg = aggregateByRole(samples);
    const result = extractComponents(samples, agg);
    expect(result['button-primary'].backgroundColor).toBe('#3B82F6');
    expect(result['button-primary'].count).toBe(3);
  });
});