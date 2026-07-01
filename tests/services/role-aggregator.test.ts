import { describe, test, expect } from 'bun:test';
import { aggregateByRole } from '../../src/services/role-aggregator';

describe('aggregateByRole', () => {
  test('returns empty result for empty input', () => {
    const result = aggregateByRole([]);
    expect(result.totals).toBe(0);
    expect(Object.keys(result.byRole).length).toBe(0);
  });

  test('groups samples by role', () => {
    const samples = [
      {
        semantic: { tag: 'BUTTON', role: null, inNav: false, inHeader: false, inMain: true, isInteractive: true, looksLikeButton: true, looksLikePrimary: true, looksLikeCard: false, looksLikeLink: false, textSample: 'Get Started', role2: 'button-primary' as const },
        style: { color: '#FFFFFF', backgroundColor: '#3B82F6', borderColor: '#3B82F6', borderRadius: '8px', fontFamily: 'Inter', fontSize: '16px', fontWeight: '600', lineHeight: '1.5', letterSpacing: 'normal', padding: '12px 24px', boxShadow: 'none' },
      },
      {
        semantic: { tag: 'BUTTON', role: null, inNav: false, inHeader: false, inMain: true, isInteractive: true, looksLikeButton: true, looksLikePrimary: true, looksLikeCard: false, looksLikeLink: false, textSample: 'Sign Up', role2: 'button-primary' as const },
        style: { color: '#FFFFFF', backgroundColor: '#3B82F6', borderColor: '#3B82F6', borderRadius: '8px', fontFamily: 'Inter', fontSize: '16px', fontWeight: '600', lineHeight: '1.5', letterSpacing: 'normal', padding: '12px 24px', boxShadow: 'none' },
      },
    ];

    const result = aggregateByRole(samples);
    expect(result.totals).toBe(2);
    expect(result.byRole['button-primary']?.count).toBe(2);
    expect(result.byRole['button-primary']?.style.backgroundColor).toBe('#3B82F6');
  });

  test('keeps most frequent property per role', () => {
    const samples = [
      { semantic: { ...baseButton(), role2: 'button-primary' as const, textSample: 'A' }, style: { ...baseStyle(), backgroundColor: '#000000' } },
      { semantic: { ...baseButton(), role2: 'button-primary' as const, textSample: 'B' }, style: { ...baseStyle(), backgroundColor: '#3B82F6' } },
      { semantic: { ...baseButton(), role2: 'button-primary' as const, textSample: 'C' }, style: { ...baseStyle(), backgroundColor: '#3B82F6' } },
    ];

    const result = aggregateByRole(samples);
    expect(result.byRole['button-primary']?.style.backgroundColor).toBe('#3B82F6');
  });

  test('records provenance text samples', () => {
    const samples = [
      { semantic: { ...baseButton(), role2: 'button-primary' as const, textSample: 'Get Started' }, style: baseStyle() },
      { semantic: { ...baseButton(), role2: 'button-primary' as const, textSample: 'Subscribe' }, style: baseStyle() },
    ];

    const result = aggregateByRole(samples);
    expect(result.byRole['button-primary']?.sources).toContain('Get Started');
    expect(result.byRole['button-primary']?.sources).toContain('Subscribe');
  });
});

function baseButton() {
  return {
    tag: 'BUTTON',
    role: null,
    inNav: false,
    inHeader: false,
    inMain: true,
    isInteractive: true,
    looksLikeButton: true,
    looksLikePrimary: true,
    looksLikeCard: false,
    looksLikeLink: false,
  };
}

function baseStyle() {
  return {
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
  };
}
