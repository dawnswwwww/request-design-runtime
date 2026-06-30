import { groupColorsByLabTolerance, normalizeColor } from '../utils/colors';
import { deriveRadiusScale, deriveSpacingScale } from '../utils/tokens';
import type { RawTokens } from './extractor';

export interface DesignSystem {
  name: string;
  colors: Record<string, string>;
  typography: Record<string, unknown>;
  spacing: Record<string, string | undefined>;
  rounded: Record<string, string | undefined>;
  shadows: string[];
}

function pickRepresentativeColor(group: string[]): string {
  return group[0];
}

export function synthesize(raw: RawTokens, ctx: { brandName: string }): DesignSystem {
  const normalized = raw.colors.map(normalizeColor).filter(Boolean);
  const groups = groupColorsByLabTolerance(normalized, 0.03);
  const representatives = groups.map(pickRepresentativeColor);

  const colors = buildColorTokens(representatives);
  const typography = buildTypographyTokens(raw.typography);

  return {
    name: ctx.brandName,
    colors,
    typography,
    spacing: deriveSpacingScale(raw.spacing),
    rounded: deriveRadiusScale(raw.radius),
    shadows: raw.shadows.slice(0, 5),
  };
}

function buildColorTokens(representatives: string[]): Record<string, string> {
  const colors: Record<string, string> = {};

  const sortedByLightness = [...representatives].sort((a, b) => lightness(b) - lightness(a));
  const lightest = sortedByLightness[0];
  const darkest = sortedByLightness[sortedByLightness.length - 1];

  if (lightest && isLight(lightest)) colors.surface = lightest;
  if (darkest && !isLight(darkest)) colors['on-surface'] = darkest;

  for (const color of representatives) {
    if (isReddish(color) && !colors.error) {
      colors.error = color;
    }
  }

  for (const color of representatives) {
    if (color === colors.surface || color === colors['on-surface'] || color === colors.error) continue;
    if (!colors.primary) {
      colors.primary = color;
    } else if (!colors.secondary) {
      colors.secondary = color;
    } else {
      break;
    }
  }

  // Add a neutral/muted color if available.
  for (const color of representatives) {
    if (Object.values(colors).includes(color)) continue;
    if (isGrayish(color) && !colors.neutral) {
      colors.neutral = color;
    }
  }

  // Limit accents to top 3 remaining frequent colors.
  let accentCount = 0;
  for (const color of representatives) {
    if (Object.values(colors).includes(color)) continue;
    if (accentCount >= 3) break;
    colors[`accent-${accentCount + 1}`] = color;
    accentCount++;
  }

  return colors;
}

function buildTypographyTokens(typography: RawTokens['typography']): Record<string, unknown> {
  if (typography.length === 0) return {};

  // Pick most common font family.
  const familyCounts = new Map<string, number>();
  for (const t of typography) {
    const firstFamily = t.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    familyCounts.set(firstFamily, (familyCounts.get(firstFamily) || 0) + 1);
  }
  const primaryFamily = Array.from(familyCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  // Distinct sizes with weights.
  const distinct = new Map<
    string,
    { fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string }
  >();
  for (const t of typography) {
    const firstFamily = t.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    if (firstFamily !== primaryFamily) continue;
    const key = `${t.fontSize}-${t.fontWeight}`;
    if (!distinct.has(key)) {
      distinct.set(key, {
        fontSize: t.fontSize,
        fontWeight: t.fontWeight,
        lineHeight: t.lineHeight,
        letterSpacing: t.letterSpacing,
      });
    }
  }

  const sorted = Array.from(distinct.values()).sort(
    (a, b) => Number.parseFloat(b.fontSize) - Number.parseFloat(a.fontSize)
  );

  const tokens: Record<string, unknown> = {};
  tokens.family = primaryFamily;

  const roles = ['headline-lg', 'headline-md', 'body-lg', 'body-md', 'body-sm', 'label-sm'];
  for (let i = 0; i < Math.min(roles.length, sorted.length); i++) {
    const t = sorted[i];
    tokens[roles[i]] = {
      fontFamily: primaryFamily,
      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
      lineHeight: t.lineHeight,
      letterSpacing: t.letterSpacing,
    };
  }

  return tokens;
}

function lightness(hex: string): number {
  const rgb = hex.match(/#(..)(..)(..)/);
  if (!rgb) return 0;
  const r = Number.parseInt(rgb[1], 16);
  const g = Number.parseInt(rgb[2], 16);
  const b = Number.parseInt(rgb[3], 16);
  return (r + g + b) / 3;
}

function saturation(hex: string): number {
  const rgb = hex.match(/#(..)(..)(..)/);
  if (!rgb) return 0;
  const r = Number.parseInt(rgb[1], 16) / 255;
  const g = Number.parseInt(rgb[2], 16) / 255;
  const b = Number.parseInt(rgb[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function isLight(hex: string): boolean {
  return lightness(hex) > 200;
}

function isReddish(hex: string): boolean {
  const rgb = hex.match(/#(..)(..)(..)/);
  if (!rgb) return false;
  const r = Number.parseInt(rgb[1], 16);
  const g = Number.parseInt(rgb[2], 16);
  const b = Number.parseInt(rgb[3], 16);
  return r > 200 && g < 150 && b < 150;
}

function isGrayish(hex: string): boolean {
  return saturation(hex) < 0.15 && lightness(hex) > 50 && lightness(hex) < 220;
}
