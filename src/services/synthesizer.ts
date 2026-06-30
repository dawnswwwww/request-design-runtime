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

  const colors: Record<string, string> = {};

  // Assign by color properties rather than order.
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
      colors[`accent-${Object.keys(colors).length}`] = color;
    }
  }

  return {
    name: ctx.brandName,
    colors,
    typography: {},
    spacing: deriveSpacingScale(raw.spacing),
    rounded: deriveRadiusScale(raw.radius),
    shadows: raw.shadows.slice(0, 5),
  };
}

function lightness(hex: string): number {
  const rgb = hex.match(/#(..)(..)(..)/);
  if (!rgb) return 0;
  const r = Number.parseInt(rgb[1], 16);
  const g = Number.parseInt(rgb[2], 16);
  const b = Number.parseInt(rgb[3], 16);
  return (r + g + b) / 3;
}

function isLight(hex: string): boolean {
  const rgb = hex.match(/#(..)(..)(..)/);
  if (!rgb) return false;
  const r = Number.parseInt(rgb[1], 16);
  const g = Number.parseInt(rgb[2], 16);
  const b = Number.parseInt(rgb[3], 16);
  return (r + g + b) / 3 > 200;
}

function isReddish(hex: string): boolean {
  const rgb = hex.match(/#(..)(..)(..)/);
  if (!rgb) return false;
  const r = Number.parseInt(rgb[1], 16);
  const g = Number.parseInt(rgb[2], 16);
  const b = Number.parseInt(rgb[3], 16);
  return r > 200 && g < 150 && b < 150;
}
