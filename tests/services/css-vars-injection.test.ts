import { describe, test, expect } from 'bun:test';
import { parseExtractionPayload, extractCssVariablesFromText } from '../../src/services/css-vars';

describe('parseExtractionPayload', () => {
  test('parses JSON envelope with samples and cssVars', () => {
    const payload = `{"samples":[{"semantic":{"tag":"BUTTON"},"style":{"color":"#FFF"}}],"cssVars":{"--color-primary":"#3B82F6"}}`;
    const result = parseExtractionPayload(payload);
    expect(result.samples.length).toBe(1);
    expect(result.cssVars).toBeDefined();
    expect(result.cssVars?.get('--color-primary')).toBe('#3B82F6');
  });

  test('parses samples-only legacy payload', () => {
    const payload = `{"samples":[{"semantic":{"tag":"BUTTON"},"style":{"color":"#FFF"}}]}`;
    const result = parseExtractionPayload(payload);
    expect(result.samples.length).toBe(1);
    expect(result.cssVars?.size).toBe(0);
  });
});

describe('extractCssVariablesFromText', () => {
  test('extracts vars from --name: value; declarations', () => {
    const css = `
      :root {
        --color-primary: #3B82F6;
        --space-md: 16px;
        --radius-sm: 4px;
      }
    `;
    const result = extractCssVariablesFromText(css);
    expect(result.get('--color-primary')).toBe('#3B82F6');
    expect(result.get('--space-md')).toBe('16px');
  });

  test('handles nested rules', () => {
    const css = `
      [data-theme="dark"] {
        --bg-card: #1f2937;
      }
    `;
    const result = extractCssVariablesFromText(css);
    expect(result.get('--bg-card')).toBe('#1f2937');
  });

  test('skips non-custom properties', () => {
    const css = `
      div {
        color: red;
        --custom: blue;
      }
    `;
    const result = extractCssVariablesFromText(css);
    expect(result.get('--custom')).toBe('blue');
    expect(result.has('color')).toBe(false);
  });
});
