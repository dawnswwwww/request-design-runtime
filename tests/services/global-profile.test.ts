import { describe, test, expect } from 'bun:test';
import { buildGlobalProfile } from '../../src/services/global-profile';
import { aggregateByRole } from '../../src/services/role-aggregator';
import type { EnrichedSample } from '../../src/services/role-aggregator';

function sample(overrides: Partial<EnrichedSample['semantic']>, style: EnrichedSample['style']): EnrichedSample {
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
      role2: 'button-primary',
      ...overrides,
    },
    style,
  };
}

const style = {
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

describe('buildGlobalProfile', () => {
  test('produces empty profile from empty input', () => {
    const result = buildGlobalProfile([]);
    expect(result.pageCount).toBe(0);
    expect(result.totals).toBe(0);
  });

  test('aggregates across pages and reports consistency score', () => {
    const pages = [
      { url: 'https://example.com/', samples: [sample({ textSample: 'A' }, style)] },
      { url: 'https://example.com/about', samples: [sample({ textSample: 'B' }, style)] },
      { url: 'https://example.com/pricing', samples: [sample({ textSample: 'C' }, style)] },
    ];

    const result = buildGlobalProfile(pages);
    expect(result.pageCount).toBe(3);

    const buttonPrimary = result.byRole['button-primary'];
    expect(buttonPrimary?.consistency).toBe(1);
    expect(buttonPrimary?.style.backgroundColor).toBe('#3B82F6');
  });

  test('marks tokens with conflicting values across pages', () => {
    const differentStyle = { ...style, backgroundColor: '#000000' };
    const pages = [
      { url: 'https://example.com/', samples: [sample({}, style)] },
      { url: 'https://example.com/about', samples: [sample({}, differentStyle)] },
    ];

    const result = buildGlobalProfile(pages);
    const buttonPrimary = result.byRole['button-primary'];
    expect(buttonPrimary).toBeDefined();
    expect(buttonPrimary?.consistency).toBeLessThan(1);
    expect(buttonPrimary?.conflictingValues?.backgroundColor).toBe('#000000');
  });

  test('records raw color frequencies from aggregates', () => {
    const pages = [
      { url: 'https://example.com/', samples: [sample({}, style)] },
    ];
    const result = buildGlobalProfile(pages);
    expect(result.colorFrequency.find((c) => c.value === '#3B82F6')).toBeDefined();
  });

  test('merges per-page aggregates from aggregateByRole', () => {
    const samples = [sample({}, style), sample({}, style)];
    const agg = aggregateByRole(samples);
    const merged = buildGlobalProfile([
      { url: 'https://example.com/', samples },
    ]);

    expect(merged.totals).toBe(agg.totals);
  });
});
