/**
 * Layer 1: name matching for CSS variables.
 * Returns the recognized role plus a confidence score.
 */
type Role =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent-1'
  | 'accent-2'
  | 'accent-3'
  | 'surface'
  | 'on-surface'
  | 'muted'
  | 'error'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'info';

const ROLE_NAMES: Role[] = [
  'primary',
  'secondary',
  'tertiary',
  'accent-1',
  'accent-2',
  'accent-3',
  'surface',
  'on-surface',
  'muted',
  'error',
  'neutral',
  'success',
  'warning',
  'info',
];

export function matchRole(name: string): Role | null {
  const lower = name.toLowerCase().replace(/_/g, '-');
  const stripped = lower.replace(/^-+/, '');

  // Direct hit: --{prefix}-{role} or --{role}
  for (const role of ROLE_NAMES) {
    const direct = new RegExp(`^(?:color|colour|col|c|bg|background|fg|fill|stroke|text|btn|button)?-{0,1}${role}(?:$|-)`);
    if (direct.test(stripped) && direct.exec(stripped)![0].endsWith(role)) {
      // Avoid pulling matches like --color-muted as --color-primary
      return role;
    }
  }

  // Reverse hit: --{role}-{prefix}
  for (const role of ROLE_NAMES) {
    const reverse = new RegExp(`^${role}-(?:color|colour|col|c|bg|background|fg|fill|stroke|text|btn|button)$`);
    if (reverse.test(stripped)) return role;
  }

  // Suffix variant: --{prefix}-{role}-{suffix} (e.g. button-primary-bg)
  for (const role of ROLE_NAMES) {
    const suffix = new RegExp(`-${role}-(?:bg|fg|color|text|border|fill|stroke)$`);
    if (suffix.test(stripped)) return role;
  }

  return null;
}

export function isShadeVariant(name: string): boolean {
  return /-\d{2,3}$/.test(name.toLowerCase());
}

export function extractShadeVariant(name: string): string | null {
  const match = name.match(/[-_](\d{2,3})$/);
  return match ? match[1] : null;
}

export function nameMatchScore(name: string): { role: Role | null; score: number; shade: string | null } {
  const role = matchRole(name);
  if (!role) return { role: null, score: 0, shade: null };

  const lower = name.toLowerCase();
  const stripped = lower.replace(/^-+/, '');

  let score = 0;
  // Direct: --{prefix}-{role} or --{role}
  if (new RegExp(`^(?:color|colour|col|c|bg|background|fg|fill|stroke)?-?${role}$`).test(stripped)) {
    score = 1.0;
  }
  // Reverse: --{role}-{prefix}
  else if (new RegExp(`^${role}-(?:color|colour|col|c|bg|background|fg|fill|stroke)$`).test(stripped)) {
    score = 0.9;
  }
  // Suffix variant: --{prefix}-{role}-{suffix}
  else if (new RegExp(`-${role}-(?:bg|fg|color|text|border|fill|stroke)$`).test(stripped)) {
    score = 0.85;
  }
  // Single-letter prefix (already covered above)

  const shade = extractShadeVariant(name);
  if (shade) {
    // Shade variants: only valid as tint/shade of the role, never as the role's base.
    score *= 0.1;
  }

  return { role, score, shade };
}
