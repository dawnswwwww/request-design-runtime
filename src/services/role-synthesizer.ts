import type { GlobalProfile } from './global-profile';
import type { Role } from '../utils/classify-elements';
import { deriveRadiusScale, deriveSpacingScale } from '../utils/tokens';

export interface DesignSystem {
  name: string;
  colors: Record<string, string>;
  typography: Record<string, unknown>;
  spacing: Record<string, string | undefined>;
  rounded: Record<string, string | undefined>;
  shadows: string[];
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

  // Primary color from button-primary, fallback to most-frequent.
  const buttonPrimary = profile.byRole['button-primary'];
  if (buttonPrimary?.style.backgroundColor && buttonPrimary.style.backgroundColor !== 'transparent' && buttonPrimary.style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    colors.primary = buttonPrimary.style.backgroundColor;
    roleProvenance['colors.primary'] = 'button-primary';
    if (buttonPrimary.style.color && buttonPrimary.style.color !== 'transparent') {
      colors['on-primary'] = buttonPrimary.style.color;
      roleProvenance['colors.on-primary'] = 'button-primary';
    }
  } else {
    const fallback = profile.colorFrequency.find(
      (c) => c.value !== 'rgba(0, 0, 0, 0)' && c.value !== 'transparent' && !isLight(c.value)
    )?.value;
    if (fallback) colors.primary = fallback;
  }

  // Surface / on-surface from a body-class role.
  const bodyRole = profile.byRole['body'];
  if (bodyRole?.style.backgroundColor && bodyRole.style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    colors.surface = bodyRole.style.backgroundColor;
    roleProvenance['colors.surface'] = 'body';
  } else {
    colors.surface = '#FFFFFF';
  }
  if (bodyRole?.style.color && bodyRole.style.color !== 'transparent') {
    colors['on-surface'] = bodyRole.style.color;
    roleProvenance['colors.on-surface'] = 'body';
  }

  // Secondary from button-secondary.
  const buttonSecondary = profile.byRole['button-secondary'];
  if (buttonSecondary?.style.backgroundColor && buttonSecondary.style.backgroundColor !== 'transparent') {
    colors.secondary = buttonSecondary.style.backgroundColor;
    roleProvenance['colors.secondary'] = 'button-secondary';
  }

  // Neutrals / accent: pull from frequency, excluding values already used.
  const used = new Set(Object.values(colors));
  for (const entry of profile.colorFrequency) {
    if (entry.value === 'rgba(0, 0, 0, 0)' || entry.value === 'transparent') continue;
    if (used.has(entry.value)) continue;
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
  if (heading?.style.fontFamily) {
    const family = heading.style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    typography.family = family;
    typography['headline-lg'] = {
      fontFamily: family,
      fontSize: heading.style.fontSize,
      fontWeight: heading.style.fontWeight,
      lineHeight: heading.style.lineHeight,
      letterSpacing: heading.style.letterSpacing,
    };
  } else if (profile.fontFrequency[0]) {
    const family = profile.fontFrequency[0].value.split(',')[0].replace(/['"]/g, '').trim();
    typography.family = family;
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
