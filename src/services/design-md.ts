import type { DesignSystem } from './synthesizer';
import type { LlmClient } from './llm';

export function buildFrontMatter(system: DesignSystem): string {
  const lines = [
    '---',
    `name: ${system.name}`,
    `description: Design system extracted from ${system.name}`,
    'colors:',
  ];

  for (const [key, value] of Object.entries(system.colors)) {
    lines.push(`  ${key}: "${value}"`);
  }

  lines.push('typography:');
  for (const [key, value] of Object.entries(system.typography)) {
    lines.push(`  ${key}: ${JSON.stringify(value)}`);
  }

  lines.push('rounded:');
  for (const [key, value] of Object.entries(system.rounded)) {
    if (value) lines.push(`  ${key}: "${value}"`);
  }

  lines.push('spacing:');
  for (const [key, value] of Object.entries(system.spacing)) {
    if (value) lines.push(`  ${key}: "${value}"`);
  }

  lines.push('components:');
  lines.push('---');

  return lines.join('\n');
}

export function buildPrompt(system: DesignSystem): string {
  return `You are a design system documentarian.
Write the Markdown body for a DESIGN.md file following the Stitch Design.md format.

Use this extracted design system data:

${JSON.stringify(system, null, 2)}

Required sections in order (use ## headings):
## Overview - brand personality, target audience, feel
## Colors - palette roles and usage
## Typography - type scale, font choices, hierarchy
## Layout - grid, spacing scale, breakpoints
## Elevation & Depth - shadows or flat hierarchy
## Shapes - corner radius philosophy
## Components - buttons, inputs, cards, etc.
## Do's and Don'ts - 4-8 concrete rules

Rules:
- Tokens are normative in the YAML front matter; prose is explanatory.
- Use token references like {colors.primary} in prose.
- Do not output the YAML front matter; only the Markdown body.
- Use standard Markdown only.`;
}

export async function generateDesignMd(system: DesignSystem, llm: LlmClient): Promise<string> {
  const frontMatter = buildFrontMatter(system);
  const prompt = buildPrompt(system);
  const body = await llm.complete(prompt, JSON.stringify(system));
  return `${frontMatter}\n\n${body}`;
}
