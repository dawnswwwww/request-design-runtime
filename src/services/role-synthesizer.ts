import type { GlobalProfile } from './global-profile';
import type { Role } from '../utils/classify-elements';
import { deriveRadiusScale, deriveSpacingScale } from '../utils/tokens';
import { parseColorToRgb, rgbToHsl } from '../utils/color-helpers';

export interface DesignSystem {
  name: string;
  colors: Record<string, string>;
  typography: Record<string, unknown>;
  spacing: Record<string, string | undefined>;
  rounded: Record<string, string | undefined>;
  shadows: string[];
  components?: Record<string, {
    backgroundColor?: string;
    color?: string;
    borderColor?: string;
    borderRadius?: string;
    padding?: string;
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    boxShadow?: string;
    count: number;
    sources: string[];
  }>;
  metadata?: {
    roleProvenance: Record<string, Role>;
    consistency: Record<Role, number>;
    conflicts: Array<{ role: Role; property: string; values: string[] }>;
    pageCount: number;
  };
}

function isLight(hex: string): boolean {
  const match = hex.match(/#(..)(..)(..)/);
  if (!match) return false;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return (r + g + b) / 3 > 200;
}

function isValidColorValue(value: string): boolean {
  if (value === 'rgba(0, 0, 0, 0)' || value === 'transparent') return false;
  // Skip shorthand with multiple rgb values.
  if ((value.match(/rgb/g) || []).length > 1) return false;
  if ((value.match(/^#[0-9a-f]{3,8}$/i) || []).length === 0 && !value.startsWith('rgb') && !value.startsWith('hsl')) return false;
  return true;
}

function scoreColorForPrimary(value: string, count: number): number {
  // Convert to HSL to score.
  const rgb = parseColorToRgb(value);
  if (!rgb) return 0;
  const { s, l } = rgbToHsl(rgb);
  if (l < 8) return 0; // too dark (probably black text)
  if (l > 92) return 0; // too light (probably white surface)
  if (s < 8 && (l < 30 || l > 70)) return 0; // grayish extremes
  // Mid-luminance + decent saturation = good primary candidate.
  // Prefer mid-luminance (40-70) and saturation >= 30.
  const lumScore = 1 - Math.abs(0.55 - l / 100); // 1 at l=55, 0.45 at l=0 or 100
  const satScore = Math.min(1, s / 50);
  return count * (lumScore * 0.6 + satScore * 0.4);
}

function pickByFrequency<T extends string>(entries: { value: string; count: number }[]): string | undefined {
  return entries[0]?.value;
}

function buildConflicts(profile: GlobalProfile): DesignSystem['metadata'] extends infer M ? M extends { conflicts: infer C } ? C : never : never {
  const out: Array<{ role: Role; property: string; values: string[] }> = [];
  for (const [role, token] of Object.entries(profile.byRole) as [Role, NonNullable<GlobalProfile['byRole'][Role]>][]) {
    if (token.conflictingValues) {
      const conflicts: Record<string, string[]> = {};
      for (const key of Object.keys(token.conflictingValues) as Array<keyof typeof token.conflictingValues>) {
        const altValue = token.conflictingValues[key];
        const primaryValue = token.style[key];
        if (altValue && primaryValue && altValue !== primaryValue) {
          if (!conflicts[key]) conflicts[key] = [];
          conflicts[key].push(primaryValue, altValue);
        }
      }
      for (const [property, values] of Object.entries(conflicts)) {
        out.push({ role, property, values: Array.from(new Set(values)) });
      }
    }
  }
  return out;
}

export function synthesizeFromRoleProfile(
  profile: GlobalProfile,
  ctx: { brandName: string }
): DesignSystem {
  const colors: Record<string, string> = {};
  const typography: Record<string, unknown> = {};
  const roleProvenance: Record<string, Role> = {};

  const cssColors = (profile.cssVarTokens?.colors as Record<string, string> | undefined) || {};

  // Primary color: prefer CSS-var, fallback to button-primary, then color frequency.
  if (cssColors.primary) {
    colors.primary = cssColors.primary;
    roleProvenance['colors.primary'] = 'css-var';
  }
  if (cssColors['on-primary']) {
    colors['on-primary'] = cssColors['on-primary'];
    roleProvenance['colors.on-primary'] = 'css-var';
  }

  if (!colors.primary) {
    const buttonPrimary = profile.byRole['button-primary'];
    if (buttonPrimary?.style.backgroundColor && buttonPrimary.style.backgroundColor !== 'transparent' && buttonPrimary.style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      colors.primary = buttonPrimary.style.backgroundColor;
      roleProvenance['colors.primary'] = 'button-primary';
      if (buttonPrimary.style.color && buttonPrimary.style.color !== 'transparent') {
        colors['on-primary'] = buttonPrimary.style.color;
        roleProvenance['colors.on-primary'] = 'button-primary';
      }
    } else {
      // Prefer a deeply-saturated non-extreme (not black, not white) color.
      const candidates = profile.colorFrequency
        .filter((c) => isValidColorValue(c.value))
        .sort((a, b) => b.count - a.count);

      // Score: weight by count, brightness penalty, saturation bonus.
      const scored = candidates
        .map((c) => ({ value: c.value, score: scoreColorForPrimary(c.value, c.count) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score);
      const best = scored[0]?.value;
      if (best) {
        colors.primary = best;
        roleProvenance['colors.primary'] = 'color-frequency';
      }
    }
  }

  // Surface / on-surface: prefer CSS-var, fallback to body role.
  if (cssColors.surface) {
    colors.surface = cssColors.surface;
    roleProvenance['colors.surface'] = 'css-var';
  } else {
    const bodyRole = profile.byRole['body'];
    if (bodyRole?.style.backgroundColor && bodyRole.style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      colors.surface = bodyRole.style.backgroundColor;
      roleProvenance['colors.surface'] = 'body';
    } else {
      colors.surface = '#FFFFFF';
    }
  }
  if (cssColors['on-surface']) {
    colors['on-surface'] = cssColors['on-surface'];
    roleProvenance['colors.on-surface'] = 'css-var';
  } else {
    const bodyRole = profile.byRole['body'];
    if (bodyRole?.style.color && bodyRole.style.color !== 'transparent') {
      colors['on-surface'] = bodyRole.style.color;
      roleProvenance['colors.on-surface'] = 'body';
    }
  }

  // Secondary: CSS-var first, then button-secondary.
  if (cssColors.secondary) {
    colors.secondary = cssColors.secondary;
    roleProvenance['colors.secondary'] = 'css-var';
  } else {
    const buttonSecondary = profile.byRole['button-secondary'];
    if (buttonSecondary?.style.backgroundColor && buttonSecondary.style.backgroundColor !== 'transparent') {
      colors.secondary = buttonSecondary.style.backgroundColor;
      roleProvenance['colors.secondary'] = 'button-secondary';
    }
  }

  // Semantic colors from CSS-var.
  if (cssColors.error) {
    colors.error = cssColors.error;
    roleProvenance['colors.error'] = 'css-var';
  }
  if (cssColors.success) {
    colors.success = cssColors.success;
    roleProvenance['colors.success'] = 'css-var';
  }
  if (cssColors.warning) {
    colors.warning = cssColors.warning;
    roleProvenance['colors.warning'] = 'css-var';
  }
  if (cssColors.info) {
    colors.info = cssColors.info;
    roleProvenance['colors.info'] = 'css-var';
  }
  if (cssColors.neutral) {
    colors.neutral = cssColors.neutral;
    roleProvenance['colors.neutral'] = 'css-var';
  }

  // Neutrals / accent: pull from frequency, excluding values already used.
  const used = new Set(Object.values(colors));
  for (const entry of profile.colorFrequency) {
    if (entry.value === 'rgba(0, 0, 0, 0)' || entry.value === 'transparent') continue;
    if (used.has(entry.value)) continue;
    // Reject shorthand values (multiple space-separated colors).
    if (/\s.*(rgb|#)/.test(entry.value)) continue;
    if (!colors.neutral && isGrayishColor(entry.value)) {
      colors.neutral = entry.value;
      continue;
    }
    if (!colors.accent) {
      colors.accent = entry.value;
      break;
    }
  }

  // Heading typography.
  const heading = profile.byRole['heading'];
  const cssFamily = cssColors['font-family'] || profile.cssVarTokens?.typography?.family;
  if (cssFamily) {
    const family = cssFamily.split(',')[0].replace(/['"]/g, '').trim();
    typography.family = family;
  }
  // Pick the dominant sans-serif font for the family.
  const sansFamily = pickDominantFontFamily(profile.fontFrequency);
  if (sansFamily) {
    typography.family = sansFamily;
  }

  if (heading?.style.fontFamily) {
    const family = heading.style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    typography['headline-lg'] = {
      fontFamily: typography.family || family,
      fontSize: heading.style.fontSize,
      fontWeight: heading.style.fontWeight,
      lineHeight: heading.style.lineHeight,
      letterSpacing: heading.style.letterSpacing,
    };
  }

  const radii = profile.radiusFrequency.map((r) => r.value);
  const rounded = deriveRadiusScale(radii);

  const spacingMap = deriveSpacingScale(
    radii.length ? radii : ['4px', '8px', '16px', '24px']
  );

  const shadows = profile.shadowFrequency.slice(0, 5).map((s) => s.value);

  const consistency: Record<Role, number> = {} as Record<Role, number>;
  for (const [role, token] of Object.entries(profile.byRole) as [Role, NonNullable<GlobalProfile['byRole'][Role]>][]) {
    consistency[role] = token.consistency;
  }

  return {
    name: ctx.brandName,
    colors,
    typography,
    spacing: spacingMap,
    rounded,
    shadows,
    metadata: {
      roleProvenance,
      consistency,
      conflicts: buildConflicts(profile) as never,
      pageCount: profile.pageCount,
    },
  };
}

function isGrayishColor(hex: string): boolean {
  const match = hex.match(/#(..)(..)(..)/);
  if (!match) return false;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
}

const SANS_HINTS = ['sans', 'system', 'helvetica', 'arial', 'inter', 'roboto', 'open sans', 'cantarell', 'lato', 'montserrat', 'noto sans', 'pingfang', 'microsoft yahei', 'sf pro'];

function isSansLike(family: string): boolean {
  const lower = family.toLowerCase();
  return SANS_HINTS.some((hint) => lower.includes(hint));
}

function pickDominantFontFamily(
  frequency: Array<{ value: string; count: number }>
): string | undefined {
  // Filter out serifs/decoratives, sort by count, return top sans.
  const sansEntries = frequency
    .map((entry) => {
      const firstFamily = entry.value.split(',')[0].replace(/['"]/g, '').trim();
      return { family: firstFamily, count: entry.count };
    })
    .filter((e) => e.family && isSansLike(e.family));

  if (sansEntries.length === 0) return undefined;
  sansEntries.sort((a, b) => b.count - a.count);
  return sansEntries[0].family;
}
