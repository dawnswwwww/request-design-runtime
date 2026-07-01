import type { Role } from './css-name-match';

export type SemanticRole =
  | 'primary'
  | 'on-primary'
  | 'secondary'
  | 'tertiary'
  | 'accent-1'
  | 'accent-2'
  | 'accent-3'
  | 'surface'
  | 'on-surface'
  | 'muted'
  | 'neutral'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'primary-tint'
  | 'primary-shade'
  | 'secondary-tint'
  | 'secondary-shade';

const ROLE_KEYS: SemanticRole[] = [
  'on-primary',
  'on-surface',
  'primary',
  'secondary',
  'tertiary',
  'accent-1',
  'accent-2',
  'accent-3',
  'surface',
  'muted',
  'neutral',
  'error',
  'success',
  'warning',
  'info',
];

const SEMANTIC_BY_VARIANT: Record<string, SemanticRole> = {
  'state-error': 'error',
  'state-success': 'success',
  'state-warn': 'warning',
  'state-warning': 'warning',
  'state-info': 'info',
  'brand': 'primary',
  'alias-brand': 'primary',
  'alias-button': 'primary',
  'alias-state': 'error',
};

function tokenIsColor(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v === 'transparent' || v === 'inherit' || v === 'initial') return false;
  if (v.startsWith('var(') || v.includes('var(')) return false;
  return v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl');
}

export function mapCssVarToRole(name: string): SemanticRole | null {
  const lower = name.toLowerCase().replace(/_/g, '-');
  const stripped = lower.replace(/^-+/, '');

  // Pass through for shade variants; handled separately by mapCssVarToShadeVariant.
  if (/-(\d{2,3})$/.test(stripped)) {
    return null;
  }

  // Check semantic variants FIRST so state-error-primary doesn't fall through to "primary".
  for (const [variant, role] of Object.entries(SEMANTIC_BY_VARIANT)) {
    if (stripped.includes(`-${variant}-`) || stripped.endsWith(`-${variant}`)) {
      return role;
    }
  }

  for (const role of ROLE_KEYS) {
    if (stripped.endsWith(`-${role}`)) return role;
    if (stripped === role) return role;
  }

  return null;
}

export interface ShadeVariant {
  role: SemanticRole;
  shadeNumber: number;
}

export function mapCssVarToShadeVariant(name: string, baseRole: SemanticRole): ShadeVariant | null {
  const match = name.match(/[-_](\d{2,3})$/);
  if (!match) return null;
  const num = Number.parseInt(match[1], 10);
  if (num < 0 || num > 1000) return null;

  if (num <= 100) {
    return { role: `${baseRole}-tint` as SemanticRole, shadeNumber: num };
  }
  if (num >= 500) {
    return { role: `${baseRole}-shade` as SemanticRole, shadeNumber: num };
  }
  return { role: baseRole, shadeNumber: num };
}

export function recognizeColorRoles(vars: Record<string, string>): Partial<Record<SemanticRole, string>> {
  const out: Partial<Record<SemanticRole, string>> = {};

  for (const [name, value] of Object.entries(vars)) {
    if (!tokenIsColor(value)) continue;

    const role = mapCssVarToRole(name);
    if (role) {
      // Don't overwrite a stronger role with a weaker one.
      if (!out[role]) out[role] = value;
      continue;
    }

    // Try shade variants
    const baseMatch = name.match(/^--?(?:color|colour|col|c|bg|background|fg|fill|stroke|brand|alias)?[-_]?(primary|secondary|tertiary|neutral|surface|on-surface|error|success|warning|info)/i);
    if (baseMatch) {
      const baseRole = baseMatch[1].toLowerCase() as SemanticRole;
      const shade = mapCssVarToShadeVariant(name, baseRole);
      if (shade && !out[shade.role]) {
        out[shade.role] = value;
      }
    }
  }

  return out;
}