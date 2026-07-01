import { describe, test, expect } from 'bun:test';
import { buildFrontMatter } from '../../src/services/design-md';
import type { DesignSystem } from '../../src/services/role-synthesizer';

const systemWithComponents: DesignSystem = {
  name: 'Example',
  colors: { primary: '#3B82F6' },
  typography: { family: 'Inter' },
  spacing: {},
  rounded: { md: '8px' },
  shadows: [],
  components: {
    'button-primary': {
      backgroundColor: '#3B82F6',
      color: '#FFFFFF',
      borderRadius: '8px',
      padding: '12px 24px',
      fontSize: '16px',
      fontWeight: '600',
      count: 5,
      sources: ['Get Started', 'Sign Up'],
    },
    'card': {
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E7EB',
      borderRadius: '12px',
      padding: '16px',
      count: 3,
      sources: [],
    },
  },
};

describe('buildFrontMatter with components', () => {
  test('emits components section in YAML', () => {
    const yaml = buildFrontMatter(systemWithComponents);
    expect(yaml).toContain('components:');
    expect(yaml).toContain('button-primary:');
    expect(yaml).toContain('backgroundColor: "#3B82F6"');
    expect(yaml).toContain('borderRadius: "8px"');
    expect(yaml).toContain('sources:');
    expect(yaml).toContain('Get Started');
  });

  test('emits card section', () => {
    const yaml = buildFrontMatter(systemWithComponents);
    expect(yaml).toContain('card:');
    expect(yaml).toContain('borderColor: "#E5E7EB"');
  });

  test('omits empty components map gracefully', () => {
    const system: DesignSystem = {
      name: 'Empty',
      colors: {},
      typography: {},
      spacing: {},
      rounded: {},
      shadows: [],
    };
    const yaml = buildFrontMatter(system);
    expect(yaml).toContain('components:');
  });
});