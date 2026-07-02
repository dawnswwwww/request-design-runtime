import { describe, test, expect } from 'bun:test';
import { buildGlobalProfile } from '../../src/services/global-profile';
import { synthesizeFromRoleProfile } from '../../src/services/role-synthesizer';
import type { GlobalProfile } from '../../src/services/global-profile';

function buttonSample(bg: string, fontSize = '16px') {
  return {
    semantic: {
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
      textSample: 'Click',
      role2: 'button-primary' as const,
    },
    style: {
      color: '#FFFFFF',
      backgroundColor: bg,
      borderColor: bg,
      borderRadius: '8px',
      fontFamily: 'Inter',
      fontSize,
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: 'normal',
      padding: '12px 24px',
      boxShadow: 'none',
    },
  };
}

function bodySample(bg: string, color: string) {
  return {
    semantic: {
      tag: 'BODY',
      role: null,
      inNav: false,
      inHeader: false,
      inMain: true,
      isInteractive: false,
      looksLikeButton: false,
      looksLikePrimary: false,
      looksLikeCard: false,
      looksLikeLink: false,
      textSample: '',
      role2: 'body' as const,
    },
    style: {
      color,
      backgroundColor: bg,
      borderColor: 'transparent',
      borderRadius: '0px',
      fontFamily: 'Inter',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: 'normal',
      padding: '0px',
      boxShadow: 'none',
    },
  };
}

describe('cross-page consistency weight', () => {
  test('full-page consistency scores 1.0', () => {
    const pages = [
      { url: 'https://a/', samples: [buttonSample('#3B82F6'), bodySample('#FFF', '#000')] },
      { url: 'https://a/b', samples: [buttonSample('#3B82F6'), bodySample('#FFF', '#000')] },
      { url: 'https://a/c', samples: [buttonSample('#3B82F6'), bodySample('#FFF', '#000')] },
    ];
    const profile = buildGlobalProfile(pages);
    expect(profile.byRole['button-primary']?.consistency).toBe(1);
    expect(profile.byRole['body']?.consistency).toBe(1);
  });

  test('partial consistency: role missing on one page', () => {
    const pages = [
      { url: 'a/', samples: [buttonSample('#3B82F6')] },
      { url: 'a/b', samples: [buttonSample('#3B82F6')] },
      { url: 'a/c', samples: [] }, // no button-primary on this page
    ];
    const profile = buildGlobalProfile(pages);
    expect(profile.byRole['button-primary']?.pagesWithRole).toBe(2);
    expect(profile.byRole['button-primary']?.consistency).toBeCloseTo(2 / 3, 1);
  });

  test('value-agreement when same color across pages', () => {
    const pages = [
      { url: 'a/', samples: [buttonSample('#3B82F6')] },
      { url: 'a/b', samples: [buttonSample('#3B82F6')] },
    ];
    const profile = buildGlobalProfile(pages);
    expect(profile.byRole['button-primary']?.consistency).toBe(1);
  });
});

describe('synthesizer metadata carries cross-page stats', () => {
  test('full consistency: surfaces metadata.consistency scores', () => {
    const pages = [
      { url: 'a/', samples: [buttonSample('#3B82F6')] },
      { url: 'a/b', samples: [buttonSample('#3B82F6')] },
    ];
    const profile = buildGlobalProfile(pages);
    const system = synthesizeFromRoleProfile(profile, { brandName: 'Test' });
    expect(system.metadata?.consistency['button-primary']).toBe(1);
  });

  test('value conflict recorded in metadata', () => {
    const pages = [
      { url: 'a/', samples: [buttonSample('#3B82F6')] },
      { url: 'a/b', samples: [buttonSample('#1D4ED8')] },
    ];
    const profile = buildGlobalProfile(pages);
    expect(profile.byRole['button-primary']?.conflictingValues?.backgroundColor).toBe('#1D4ED8');
    expect(profile.byRole['button-primary']?.pagesWithRole).toBe(2);
  });

  test('pageTotal reflects total pages analyzed', () => {
    const pages = [
      { url: 'a/', samples: [buttonSample('#3B82F6')] },
      { url: 'a/b', samples: [buttonSample('#3B82F6')] },
      { url: 'a/c', samples: [buttonSample('#3B82F6')] },
    ];
    const profile = buildGlobalProfile(pages);
    const system = synthesizeFromRoleProfile(profile, { brandName: 'Test' });
    expect(system.metadata?.pageCount).toBe(3);
  });
});

describe('LLM prompt mentions cross-page consistency', () => {
  test('prompt mentions page count', async () => {
    const { buildPrompt } = await import('../../src/services/design-md');
    const profile: GlobalProfile = {
      pageCount: 5,
      totals: 0,
      byRole: {
        'button-primary': {
          role: 'button-primary',
          style: {
            color: '',
            backgroundColor: '#3B82F6',
            borderColor: '',
            borderRadius: '',
            fontFamily: '',
            fontSize: '',
            fontWeight: '',
            lineHeight: '',
            letterSpacing: '',
            padding: '',
            boxShadow: '',
          },
          pagesWithRole: 5,
          pageTotal: 5,
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
    const system = synthesizeFromRoleProfile(profile, { brandName: 'Test' });
    const prompt = buildPrompt(system);
    expect(prompt).toContain('5 pages analyzed');
    expect(prompt).toContain('button-primary: 100%');
  });
});