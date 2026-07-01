import { describe, test, expect } from 'bun:test';
import { applyDecisionsToDesignSystem, type RoleDecisionResult } from '../../src/services/token-merge';
import type { DesignSystem } from '../../src/services/role-synthesizer';

const baseSystem: DesignSystem = {
  name: 'Test',
  colors: { primary: '#3B82F6', accent: '#94A3B8' },
  typography: { family: 'Inter' },
  spacing: {},
  rounded: {},
  shadows: [],
};

describe('applyDecisionsToDesignSystem', () => {
  test('high-confidence css-var primary overrides computed primary', () => {
    const result: RoleDecisionResult = {
      decisions: [
        {
          role: 'primary',
          value: '#1D4ED8',
          source: 'css-var',
          confidence: { score: 0.9, factors: { nameMatch: 1, colorMatch: 1, consistent: 1, shade: false }, reasons: [] },
          reasons: [],
        },
      ],
      rejected: [],
    };
    const system = applyDecisionsToDesignSystem(baseSystem, result);
    expect(system.colors.primary).toBe('#1D4ED8');
  });

  test('low-confidence css-var does not override', () => {
    const result: RoleDecisionResult = {
      decisions: [
        {
          role: 'primary',
          value: '#3B82F6',
          source: 'computed',
          confidence: { score: 0.1, factors: { nameMatch: 0.1, colorMatch: 1, consistent: 1, shade: false }, reasons: ['low score'] },
          reasons: [],
        },
      ],
      rejected: [],
    };
    const system = applyDecisionsToDesignSystem(baseSystem, result);
    expect(system.colors.primary).toBe('#3B82F6');
  });

  test('shade variants are demoted to accent-*', () => {
    const result: RoleDecisionResult = {
      decisions: [
        {
          role: 'accent-1',
          value: '#EBF2FC',
          source: 'css-var',
          confidence: { score: 0.8, factors: { nameMatch: 0.8, colorMatch: 1, consistent: 1, shade: true }, reasons: ['shade'] },
          reasons: ['shade'],
        },
      ],
      rejected: [
        { name: '--color-primary-50', role: 'primary', value: '#EBF2FC', score: 0.05, reason: 'shade demoted' },
      ],
    };
    const system = applyDecisionsToDesignSystem(baseSystem, result);
    expect(system.colors['accent-1']).toBe('#EBF2FC');
    expect((system.metadata as { rejectedCssVars?: unknown[] })?.rejectedCssVars).toBeDefined();
  });

  test('records source attribution in metadata', () => {
    const result: RoleDecisionResult = {
      decisions: [
        {
          role: 'primary',
          value: '#1D4ED8',
          source: 'css-var',
          confidence: { score: 0.9, factors: { nameMatch: 1, colorMatch: 1, consistent: 1, shade: false }, reasons: [] },
          reasons: [],
        },
      ],
      rejected: [],
    };
    const system = applyDecisionsToDesignSystem(baseSystem, result);
    expect((system.metadata as { tokenSources?: { primary?: string } })?.tokenSources?.primary).toBe('css-var');
  });
});
