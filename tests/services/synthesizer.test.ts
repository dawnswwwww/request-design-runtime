import { describe, test, expect } from 'bun:test';
import { synthesize } from '../../src/services/synthesizer';

describe('synthesizer', () => {
  test('builds color tokens by role', () => {
    const raw = {
      colors: ['#3B82F6', '#FFFFFF', '#1F2937', '#EF4444'],
      typography: [],
      spacing: [],
      radius: [],
      shadows: [],
    };

    const system = synthesize(raw, { brandName: 'Example' });
    expect(system.colors.primary).toBe('#3B82F6');
    expect(system.colors.surface).toBe('#FFFFFF');
    expect(system.colors['on-surface']).toBe('#1F2937');
    expect(system.colors.error).toBe('#EF4444');
  });

  test('groups similar colors', () => {
    const raw = {
      colors: ['#3B82F6', '#3B82F7', '#FFFFFF'],
      typography: [],
      spacing: [],
      radius: [],
      shadows: [],
    };

    const system = synthesize(raw, { brandName: 'Example' });
    expect(Object.keys(system.colors).length).toBeLessThan(3);
  });

  test('builds spacing scale', () => {
    const raw = {
      colors: [],
      typography: [],
      spacing: ['4px', '8px', '16px', '15px', '24px'],
      radius: [],
      shadows: [],
    };

    const system = synthesize(raw, { brandName: 'Example' });
    expect(system.spacing.xs).toBe('4px');
    expect(system.spacing.md).toBe('16px');
  });

  test('builds radius scale', () => {
    const raw = {
      colors: [],
      typography: [],
      spacing: [],
      radius: ['0px', '4px', '8px', '9999px'],
      shadows: [],
    };

    const system = synthesize(raw, { brandName: 'Example' });
    expect(system.rounded.sm).toBe('4px');
    expect(system.rounded.full).toBe('9999px');
  });

  test('sets metadata from brand name', () => {
    const raw = {
      colors: [],
      typography: [],
      spacing: [],
      radius: [],
      shadows: [],
    };

    const system = synthesize(raw, { brandName: 'Stripe' });
    expect(system.name).toBe('Stripe');
  });
});
