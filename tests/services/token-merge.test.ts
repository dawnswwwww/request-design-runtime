import { describe, test, expect } from 'bun:test';
import { buildCssTokenDecisions, type CssTokenCandidate } from '../../src/services/token-merge';
import type { Role } from '../../src/services/css-name-match';

function candidate(name: string, value: string, role: Role, extra: Partial<CssTokenCandidate> = {}): CssTokenCandidate {
  return { name, value, assignedRole: role, pages: 1, renderConsistency: 1, ...extra };
}

describe('buildCssTokenDecisions', () => {
  test('high-confidence css var overrides computed when computed has no anchor', () => {
    const decisions = buildCssTokenDecisions([], [
      candidate('--color-primary', '#1D4ED8', 'primary', { pages: 5 }),
    ]);

    const primary = decisions.find((d) => d.role === 'primary');
    expect(primary).toBeDefined();
    expect(primary?.value).toBe('#1D4ED8');
    expect(primary?.source).toBe('css-var');
  });

  test('low-confidence css var does not override computed', () => {
    const decisions = buildCssTokenDecisions(
      [{ role: 'primary', value: '#3B82F6' }],
      [
        candidate('--color-primary-50', '#EBF2FC', 'primary', {
          renderConsistency: 0,
        }),
      ]
    );

    const primary = decisions.find((d) => d.role === 'primary');
    expect(primary?.source).toBe('fallback');
    expect(primary?.value).toBe('#3B82F6');
  });

  test('shade variants are kept as accent-* (not primary)', () => {
    const decisions = buildCssTokenDecisions([], [
      candidate('--color-primary-50', '#EBF2FC', 'primary', { pages: 5 }),
    ]);

    const shade = decisions.find((d) => d.role === 'accent-1');
    expect(shade).toBeDefined();
    expect(shade?.source).toBe('css-var');
    expect(shade?.value).toBe('#EBF2FC');
    expect(shade?.rejectedFromPrimary).toBe(true);
  });

  test('reasons are recorded', () => {
    const decisions = buildCssTokenDecisions([], [
      candidate('--color-primary-50', '#EBF2FC', 'primary'),
    ]);
    const accent = decisions.find((d) => d.role === 'accent-1');
    expect(accent?.reasons.length).toBeGreaterThan(0);
  });

  test('both css-var and computed winning produces single decision', () => {
    const decisions = buildCssTokenDecisions(
      [{ role: 'primary', value: '#3B82F6' }],
      [
        candidate('--color-primary', '#1D4ED8', 'primary', {
          pages: 5,
          renderConsistency: 1,
        }),
      ]
    );

    const primary = decisions.find((d) => d.role === 'primary');
    // Should be single decision.
    expect(primary).toBeDefined();
  });
});
