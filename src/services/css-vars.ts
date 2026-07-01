export type TokenType = 'color' | 'spacing' | 'radius' | 'typography';

const COLOR_PATTERNS = [
  /^(?:--)?(?:color|col|c|bg|background|fg|fill|stroke)(?:[-_]?.*)?$/i,
];

const SPACING_PATTERNS = [
  /^(?:--)?(?:space|spacing|gap|inset)(?:[-_].*)?$/i,
  /^(?:--)?(?:p|m|px|py|mx|my|pt|pb|mb|mt)-\d+$/i,
  /^(?:--)?[pm]-\d+$/i,
];

const RADIUS_PATTERNS = [
  /^(?:--)?(?:radius|rad|r|rounded|rd)(?:[-_].*)?$/i,
];

const TYPOGRAPHY_PATTERNS = [
  /^(?:--)?(?:font|fs|fw|family|leading|tracking)(?:[-_].*)?$/i,
  /^(?:--)?text-(?:xs|sm|base|lg|xl|\d+)$/i,
];

export function parseCssVariables(raw: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [name, value] of Object.entries(raw)) {
    map.set(name, value);
  }
  return map;
}

function matchAny(name: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(name));
}

export function inferRoleTokenType(name: string): TokenType | undefined {
  if (matchAny(name, COLOR_PATTERNS)) return 'color';
  if (matchAny(name, SPACING_PATTERNS)) return 'spacing';
  if (matchAny(name, RADIUS_PATTERNS)) return 'radius';
  if (matchAny(name, TYPOGRAPHY_PATTERNS)) return 'typography';
  return undefined;
}

const ROLE_NAMES = [
  'primary',
  'secondary',
  'tertiary',
  'neutral',
  'muted',
  'subtle',
  'error',
  'warning',
  'success',
  'info',
  'on-primary',
  'on-secondary',
  'on-surface',
  'on-muted',
  'surface',
  'background',
];

export function extractNamedRole(name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const role of ROLE_NAMES) {
    const withDash = `-${role}`;
    if (lower.endsWith(withDash) || lower.includes(`${withDash}-`)) {
      return role;
    }
  }

  // accent-N
  const accentMatch = lower.match(/[-_]accent[-_](\d+)/);
  if (accentMatch) return `accent-${accentMatch[1]}`;

  return undefined;
}

export interface ExtractionPayload {
  samples: unknown[];
  cssVars: Map<string, string>;
}

export function parseExtractionPayload(raw: string): ExtractionPayload {
  let parsed: { samples?: unknown[]; cssVars?: Record<string, string> } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { samples: [], cssVars: new Map() };
  }

  const cssVars = new Map<string, string>();
  for (const [k, v] of Object.entries(parsed.cssVars || {})) {
    cssVars.set(k, v);
  }

  return {
    samples: Array.isArray(parsed.samples) ? parsed.samples : [],
    cssVars,
  };
}

export function extractCssVariablesFromText(css: string): Map<string, string> {
  const result = new Map<string, string>();
  const regex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(css)) !== null) {
    const name = `--${match[1]}`;
    const value = match[2].trim();
    result.set(name, value);
  }
  return result;
}
