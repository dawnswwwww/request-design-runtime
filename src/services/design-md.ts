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
  const components = system.components || {};
  for (const [role, comp] of Object.entries(components)) {
    if (!comp) continue;
    lines.push(`  ${role}:`);
    const keys: (keyof typeof comp)[] = [
      'backgroundColor',
      'color',
      'borderColor',
      'borderRadius',
      'padding',
      'fontSize',
      'fontWeight',
      'fontFamily',
      'boxShadow',
    ];
    for (const key of keys) {
      const value = comp[key];
      if (typeof value === 'string' && value) lines.push(`    ${key}: "${value}"`);
    }
    if (comp.sources && comp.sources.length > 0) {
      lines.push('    sources:');
      for (const src of comp.sources) lines.push(`      - "${src}"`);
    }
  }

  // Cross-page consistency metadata
  if (system.metadata?.pageCount) {
    lines.push('crossPageConsistency:');
    lines.push(`  pagesAnalyzed: ${system.metadata.pageCount}`);
    const consistency = system.metadata.consistency || {};
    for (const [role, score] of Object.entries(consistency)) {
      lines.push(`  ${role}: ${Math.round(score as number * 100)}%`);
    }
  }

  lines.push('---');

  return lines.join('\n');
}

export function buildPrompt(system: DesignSystem): string {
  const pageCount = system.metadata?.pageCount ?? 0;
  const consistency = system.metadata?.consistency ?? {};

  const consistencyLines = Object.entries(consistency)
    .filter(([, v]) => typeof v === 'number')
    .map(([role, v]) => `  - ${role}: ${Math.round((v as number) * 100)}% across ${pageCount} pages`)
    .join('\n');

  return `You are a design system documentarian.
Write the Markdown body for a DESIGN.md file following the Stitch Design.md format.

Use this extracted design system data:

${JSON.stringify(system, null, 2)}

Cross-page consistency (${pageCount} pages analyzed):
${consistencyLines || '  (no cross-page data)'}

When the same role appears on every page (consistency = 100%), treat its tokens as the canonical values.
If a token has conflicting values across pages, mention the inconsistency in the prose ("on the marketing pages the button shifts to {colors.primary-conflict}") but keep the YAML token as the most common value.

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
- Reference cross-page consistency in the Do's and Don'ts section ("ensure ${pageCount} pages share ${Object.keys(consistency)[0] ?? 'primary'} consistency").
- Do not output the YAML front matter; only the Markdown body.
- Use standard Markdown only.`;
}

export async function generateDesignMd(system: DesignSystem, llm: LlmClient): Promise<string> {
  const frontMatter = buildFrontMatter(system);
  const prompt = buildPrompt(system);
  const body = await llm.complete(prompt, JSON.stringify(system));
  return `${frontMatter}\n\n${body}`;
}
