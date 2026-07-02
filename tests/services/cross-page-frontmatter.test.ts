import { describe, test, expect } from 'bun:test';
import { buildFrontMatter } from '../../src/services/design-md';
import type { DesignSystem } from '../../src/services/role-synthesizer';

const system: DesignSystem = {
  name: 'Test',
  colors: { primary: '#3B82F6' },
  typography: {},
  spacing: {},
  rounded: {},
  shadows: [],
  metadata: {
    pageCount: 5,
    consistency: {
      'button-primary': 1,
      body: 0.6,
    },
    roleProvenance: {},
    conflicts: [],
  },
};

describe('front matter crossPageConsistency', () => {
  test('emits pagesAnalyzed', () => {
    const yaml = buildFrontMatter(system);
    expect(yaml).toContain('crossPageConsistency:');
    expect(yaml).toContain('pagesAnalyzed: 5');
  });

  test('emits per-role consistency percentages', () => {
    const yaml = buildFrontMatter(system);
    expect(yaml).toContain('button-primary: 100%');
    expect(yaml).toContain('body: 60%');
  });

  test('omits block when no metadata', () => {
    const minimal: DesignSystem = {
      name: 'M',
      colors: {},
      typography: {},
      spacing: {},
      rounded: {},
      shadows: [],
    };
    const yaml = buildFrontMatter(minimal);
    expect(yaml).not.toContain('crossPageConsistency:');
  });
});