import { normalizeColor } from './colors';

export interface SpacingScale {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

export interface RadiusScale {
  none?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  full?: string;
}

function parsePx(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)px$/);
  return match ? Number.parseFloat(match[1]) : null;
}

export function deriveSpacingScale(values: string[]): SpacingScale {
  const pixels = values.map(parsePx).filter((n): n is number => n !== null);
  if (pixels.length === 0) return {};

  const scale: SpacingScale = {};
  const targets = [
    { key: 'xs' as const, value: 4 },
    { key: 'sm' as const, value: 8 },
    { key: 'md' as const, value: 16 },
    { key: 'lg' as const, value: 24 },
    { key: 'xl' as const, value: 48 },
  ];

  for (const target of targets) {
    const closest = pixels.find((p) => Math.abs(p - target.value) <= 2);
    if (closest !== undefined) {
      scale[target.key] = `${closest}px`;
    }
  }

  return scale;
}

export function deriveRadiusScale(values: string[]): RadiusScale {
  // Filter out absurdly large values (>= 128px is almost certainly not a corner
  // radius — it's likely a layout dimension that got picked up by mistake).
  // Always keep "9999px" and "100%" patterns (used for full/pill radius).
  const saneValues = values.filter((v) => {
    if (v.includes('9999') || v.includes('100%')) return true;
    const px = parsePx(v);
    if (px === null) return true; // unknown format, keep
    return px < 128;
  });
  const pixels = saneValues.map(parsePx).filter((n): n is number => n !== null);
  const hasFull = saneValues.some((v) => v.includes('9999') || v.includes('100%'));

  const scale: RadiusScale = {};

  if (pixels.some((p) => p === 0)) scale.none = '0px';
  if (pixels.some((p) => Math.abs(p - 4) <= 1)) scale.sm = '4px';
  if (pixels.some((p) => Math.abs(p - 8) <= 2)) scale.md = '8px';
  if (pixels.some((p) => Math.abs(p - 16) <= 4)) scale.lg = '16px';
  if (pixels.some((p) => p >= 24 && p < 128)) {
    const xl = pixels.find((p) => p >= 24 && p < 128);
    if (xl !== undefined) scale.xl = `${xl}px`;
  }
  if (hasFull) scale.full = '9999px';

  return scale;
}

interface ColorContext {
  isCta: boolean;
  coverage: number;
  isBackground: boolean;
  isText: boolean;
}

export function nameColorByRole(color: string, ctx: ColorContext): string {
  if (ctx.isCta && ctx.coverage >= 0.5) return 'primary';
  if (ctx.isBackground && ctx.coverage >= 0.1) return 'surface';
  if (ctx.isText && ctx.coverage >= 0.05) return 'on-surface';
  if (ctx.isCta) return 'secondary';
  return 'accent';
}
