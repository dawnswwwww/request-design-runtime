import { describe, test, expect } from 'bun:test';
import { mergeCssIntoProfile } from '../../src/services/css-merge';
import type { GlobalProfile } from '../../src/services/global-profile';

describe('mergeCssIntoProfile', () => {
  test('CSS-var primary overrides computed primary', () => {
    const base: GlobalProfile = {
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
      colorFrequency: [],
      fontFrequency: [],
      radiusFrequency: [],
      shadowFrequency: [],
    };

    const merged = mergeCssIntoProfile(base, {
      colors: { primary: '#FF0000', secondary: '#00FF00' },
      source: 'css-vars',
    });

    expect(merged.byRole['button-primary']?.style.backgroundColor).toBe('#FF0000');
  });

  test('CSS-var family becomes typography.family', () => {
    const base: GlobalProfile = {
      pageCount: 1,
      totals: 0,
      byRole: {},
      colorFrequency: [],
      fontFrequency: [],
      radiusFrequency: [],
      shadowFrequency: [],
    };

    const merged = mergeCssIntoProfile(base, {
      colors: {},
      typography: { family: 'Roboto' },
      source: 'css-vars',
    });

    // Family stored in metadata since synthesizer consumes GlobalProfile
    expect(merged.byRole['heading']).toBeUndefined();
  });

  test('records css-var source in metadata when present', () => {
    const base: GlobalProfile = emptyProfile();
    const merged = mergeCssIntoProfile(base, {
      colors: { primary: '#FF0000' },
      source: 'css-vars',
    });
    expect(merged.cssVarTokens).toBeDefined();
    expect(merged.cssVarTokens?.colors.primary).toBe('#FF0000');
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

function emptyProfile(): GlobalProfile {
  return {
    pageCount: 0,
    totals: 0,
    byRole: {},
    colorFrequency: [],
    fontFrequency: [],
    radiusFrequency: [],
    shadowFrequency: [],
  };
}
