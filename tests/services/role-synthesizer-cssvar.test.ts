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