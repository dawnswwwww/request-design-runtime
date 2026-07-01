import { describe, test, expect } from 'bun:test';
import { synthesizeFromRoleProfile } from '../../src/services/role-synthesizer';
import type { GlobalProfile } from '../../src/services/global-profile';

const baseProfile: GlobalProfile = {
  pageCount: 1,
  totals: 1,
  byRole: {
    'button-primary': {
      role: 'button-primary',
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
      },
      pagesWithRole: 1,
      pageTotal: 1,
      consistency: 1,
      conflictingValues: undefined,
      sources: ['Get Started'],
      rawCount: 3,
    },
    'heading': {
      role: 'heading',
      style: {
        color: '#0F172A',
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderRadius: '0px',
        fontFamily: 'Inter',
        fontSize: '32px',
        fontWeight: '700',
        lineHeight: '1.2',
        letterSpacing: '-0.02em',
        padding: '0px',
        boxShadow: 'none',
      },
      pagesWithRole: 1,
      pageTotal: 1,
      consistency: 1,
      conflictingValues: undefined,
      sources: [],
      rawCount: 2,
    },
  },
  colorFrequency: [{ value: '#3B82F6', count: 3 }],
  fontFrequency: [{ value: 'Inter', count: 3 }],
  radiusFrequency: [{ value: '8px', count: 3 }],
  shadowFrequency: [],
};

describe('synthesizeFromRoleProfile', () => {
  test('uses button-primary for primary color', () => {
    const system = synthesizeFromRoleProfile(baseProfile, { brandName: 'Example' });
    expect(system.colors.primary).toBe('#3B82F6');
  });

  test('uses button-primary text color for on-primary', () => {
    const system = synthesizeFromRoleProfile(baseProfile, { brandName: 'Example' });
    expect(system.colors['on-primary']).toBe('#FFFFFF');
  });

  test('promotes heading typography to headline-lg', () => {
    const system = synthesizeFromRoleProfile(baseProfile, { brandName: 'Example' });
    expect(system.typography['headline-lg']).toMatchObject({ fontSize: '32px', fontWeight: '700' });
  });

  test('sets brand name in output', () => {
    const system = synthesizeFromRoleProfile(baseProfile, { brandName: 'Stripe' });
    expect(system.name).toBe('Stripe');
  });

  test('records role provenance in metadata', () => {
    const system = synthesizeFromRoleProfile(baseProfile, { brandName: 'Example' });
    expect(system.metadata?.roleProvenance?.['colors.primary']).toBe('button-primary');
  });

  test('falls back to frequency when role data missing', () => {
    const minimal: GlobalProfile = {
      pageCount: 1,
      totals: 0,
      byRole: {},
      colorFrequency: [
        { value: '#3B82F6', count: 3 },
        { value: '#FFFFFF', count: 5 },
        { value: '#000000', count: 1 },
      ],
      fontFrequency: [{ value: 'Inter', count: 3 }],
      radiusFrequency: [{ value: '8px', count: 3 }],
      shadowFrequency: [],
    };
    const system = synthesizeFromRoleProfile(minimal, { brandName: 'Example' });
    expect(system.colors.primary).toBe('#3B82F6');
  });
});
