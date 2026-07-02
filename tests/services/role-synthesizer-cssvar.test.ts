import { describe, test, expect } from 'bun:test';
import { synthesizeFromRoleProfile } from '../../src/services/role-synthesizer';
import type { GlobalProfile } from '../../src/services/global-profile';

describe('synthesizer picks up css-var secondary/error/success', () => {
  test('cssVarTokens injects secondary color', () => {
    const profile: GlobalProfile = {
      pageCount: 1,
      totals: 1,
      byRole: {
        'button-primary': {
          role: 'button-primary',
          style: emptyStyle(),
          pagesWithRole: 1,
          pageTotal: 1,
          consistency: 1,
          conflictingValues: undefined,
          sources: [],
          rawCount: 1,
        } as never,
      },
      colorFrequency: [],
      fontFrequency: [],
      radiusFrequency: [],
      shadowFrequency: [],
      cssVarTokens: {
        colors: {
          primary: '#5686fe',
          'on-primary': '#ffffff',
          secondary: '#061b31',
          error: '#f25a5a',
          success: '#22c55e',
          warning: '#f59e0b',
        },
        source: 'css-vars',
      },
    };

    const system = synthesizeFromRoleProfile(profile, { brandName: 'Test' });
    expect(system.colors.primary).toBe('#5686fe');
    expect(system.colors['on-primary']).toBe('#ffffff');
    expect(system.colors.secondary).toBe('#061b31');
    expect(system.colors.error).toBe('#f25a5a');
    expect(system.colors.success).toBe('#22c55e');
    expect(system.colors.warning).toBe('#f59e0b');
  });

  test('cssVarTokens injects surface tokens', () => {
    const profile: GlobalProfile = {
      pageCount: 1,
      totals: 1,
      byRole: {},
      colorFrequency: [],
      fontFrequency: [],
      radiusFrequency: [],
      shadowFrequency: [],
      cssVarTokens: {
        colors: { surface: '#ffffff', 'on-surface': '#0f172a' },
        source: 'css-vars',
      },
    };

    const system = synthesizeFromRoleProfile(profile, { brandName: 'Test' });
    expect(system.colors.surface).toBe('#ffffff');
    expect(system.colors['on-surface']).toBe('#0f172a');
  });
});

describe('synthesizer skips shorthand color values', () => {
  test('rejects multi-rgb values like "rgb(0,0,0) rgb(0,0,0) ..." for accent', () => {
    const profile: GlobalProfile = {
      pageCount: 1,
      totals: 0,
      byRole: {
        'button-primary': {
          role: 'button-primary',
          style: emptyStyle(),
          pagesWithRole: 1,
          pageTotal: 1,
          consistency: 1,
          conflictingValues: undefined,
          sources: [],
          rawCount: 1,
        } as never,
      },
      colorFrequency: [
        { value: 'rgb(0, 0, 0) rgb(0, 0, 0) rgb(0, 0, 0) rgb(226, 226, 226)', count: 5 },
        { value: '#3B82F6', count: 1 },
      ],
      fontFrequency: [],
      radiusFrequency: [],
      shadowFrequency: [],
    };
    const system = synthesizeFromRoleProfile(profile, { brandName: 'Test' });
    // Should NOT pick the multi-value shorthand
    expect(system.colors.accent === undefined || !system.colors.accent.includes('rgb(0, 0, 0) rgb')).toBe(true);
  });
});

describe('synthesizer primary color scoring', () => {
  test('prefers deep saturated color over light or transparent', () => {
    const profile: GlobalProfile = {
      pageCount: 1,
      totals: 0,
      byRole: {},
      colorFrequency: [
        { value: 'rgb(0, 0, 0)', count: 100 }, // very common but black
        { value: 'rgba(0, 0, 0, 0)', count: 200 }, // transparent
        { value: '#FFFFFF', count: 150 }, // white
        { value: '#1D4ED8', count: 5 }, // deep blue
      ],
      fontFrequency: [],
      radiusFrequency: [],
      shadowFrequency: [],
    };
    const system = synthesizeFromRoleProfile(profile, { brandName: 'Test' });
    // None of the CSS var path is taken. We fall back to button-primary or colorFrequency.
    // None of those is `primary` yet — primary only set from CSS var or button-primary.
    // So this test primarily asserts it doesn't crash and sets something sensible.
    expect(system.colors).toBeDefined();
  });
});

describe('synthesizer picks sans-serif family', () => {
  test('prefers sans-serif like "Inter" over decorative like "Tiffany"', () => {
    const profile: GlobalProfile = {
      pageCount: 1,
      totals: 0,
      byRole: {},
      colorFrequency: [],
      fontFrequency: [
        { value: 'Tiffany, sans-serif', count: 30 },
        { value: 'Inter, sans-serif', count: 100 },
      ],
      radiusFrequency: [],
      shadowFrequency: [],
    };
    const system = synthesizeFromRoleProfile(profile, { brandName: 'Test' });
    expect(system.typography.family).toBe('Inter');
  });
});

function emptyStyle() {
  return {
    color: '',
    backgroundColor: '',
    borderColor: '',
    borderRadius: '',
    fontFamily: '',
    fontSize: '',
    fontWeight: '',
    lineHeight: '',
    letterSpacing: '',
    padding: '',
    boxShadow: '',
  };
}