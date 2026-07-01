import { describe, test, expect } from 'bun:test';
import { buildPrompt, buildFrontMatter } from '../../src/services/design-md';
import type { DesignSystem } from '../../src/services/role-synthesizer';

const system: DesignSystem = {
  name: 'Stripe',
  colors: {
    primary: '#635BFF',
    'on-primary': '#FFFFFF',
    secondary: '#0A2540',
    surface: '#FFFFFF',
    'on-surface': '#0A2540',
  },
  typography: {
    family: 'Inter',
    'headline-lg': {
      fontFamily: 'Inter',
      fontSize: '32px',
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '-0.02em',
    },
  },
  spacing: { md: '16px' },
  rounded: { md: '6px' },
  shadows: ['0 8px 24px rgba(0,0,0,0.1)'],
  metadata: {
    roleProvenance: { 'colors.primary': 'button-primary' },
    consistency: { 'button-primary': 1 },
    conflicts: [],
    pageCount: 6,
  },
};

describe('LLM prompt', () => {
  test('includes role provenance in prompt', () => {
    const prompt = buildPrompt(system);
    expect(prompt).toContain('button-primary');
    expect(prompt).toContain('colors.primary');
  });

  test('includes consistency score', () => {
    const prompt = buildPrompt(system);
    expect(prompt).toContain('100%');
  });

  test('instructs conflict awareness', () => {
    const prompt = buildPrompt(system);
    expect(prompt).toMatch(/conflict|inconsisten/i);
  });
});

describe('front matter', () => {
  test('emits primary token', () => {
    const yaml = buildFrontMatter(system);
    expect(yaml).toContain('primary: "#635BFF"');
    expect(yaml).toContain('on-primary: "#FFFFFF"');
  });
});
