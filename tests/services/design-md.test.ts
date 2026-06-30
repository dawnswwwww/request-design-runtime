import { describe, test, expect } from 'bun:test';
import { buildFrontMatter, buildPrompt, generateDesignMd } from '../../src/services/design-md';
import type { DesignSystem } from '../../src/services/synthesizer';

describe('design-md generator', () => {
  const system: DesignSystem = {
    name: 'Example',
    colors: { primary: '#3B82F6', surface: '#FFFFFF' },
    typography: {},
    spacing: { md: '16px' },
    rounded: { md: '8px' },
    shadows: ['0 1px 2px rgba(0,0,0,0.1)'],
  };

  test('buildFrontMatter returns YAML block with required fields', () => {
    const yaml = buildFrontMatter(system);
    expect(yaml).toContain('name: Example');
    expect(yaml).toContain('primary: "#3B82F6"');
    expect(yaml).toContain('surface: "#FFFFFF"');
    expect(yaml).toContain('---');
  });

  test('buildPrompt includes token data and format instructions', () => {
    const prompt = buildPrompt(system);
    expect(prompt).toContain('Example');
    expect(prompt).toContain('#3B82F6');
    expect(prompt).toContain('Stitch Design.md');
    expect(prompt).toContain('## Overview');
  });

  test('generateDesignMd combines front matter and LLM body', async () => {
    const llm = {
      complete: async () => '# Example Design System\n\n## Overview\nClean and modern.',
    };

    const md = await generateDesignMd(system, llm as never);
    expect(md).toContain('---');
    expect(md).toContain('name: Example');
    expect(md).toContain('# Example Design System');
    expect(md).toContain('## Overview');
  });
});
