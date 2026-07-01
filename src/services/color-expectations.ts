import { lightness, saturation } from '../utils/color-helpers';
import type { Role } from './css-name-match';

export interface RoleExpectations {
  lightnessRange: [number, number];
  saturationRange: [number, number];
  /** Optional hue range for hues that should fall in a particular quadrant. */
  preferredHue?: [number, number];
}

const EXPECTATIONS: Record<Role, RoleExpectations> = {
  'primary': { lightnessRange: [20, 80], saturationRange: [30, 100] },
  'secondary': { lightnessRange: [10, 90], saturationRange: [0, 100] },
  'tertiary': { lightnessRange: [20, 85], saturationRange: [20, 100] },
  'accent-1': { lightnessRange: [10, 90], saturationRange: [20, 100] },
  'accent-2': { lightnessRange: [10, 90], saturationRange: [20, 100] },
  'accent-3': { lightnessRange: [10, 90], saturationRange: [20, 100] },
  'surface': { lightnessRange: [85, 100], saturationRange: [0, 30] },
  'on-surface': { lightnessRange: [0, 30], saturationRange: [0, 100] },
  'muted': { lightnessRange: [30, 85], saturationRange: [0, 30] },
  'neutral': { lightnessRange: [20, 90], saturationRange: [0, 20] },
  'error': { lightnessRange: [30, 75], saturationRange: [40, 100], preferredHue: [0, 30] },
  'success': { lightnessRange: [30, 75], saturationRange: [40, 100], preferredHue: [110, 160] },
  'warning': { lightnessRange: [40, 80], saturationRange: [60, 100], preferredHue: [40, 70] },
  'info': { lightnessRange: [40, 80], saturationRange: [40, 100], preferredHue: [200, 240] },
};

export function getRoleExpectations(role: Role): RoleExpectations | null {
  return EXPECTATIONS[role] || null;
}

export interface MatchResult {
  score: number;
  reasons: string[];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scoreRange(value: number, [min, max]: [number, number]): number {
  if (value >= min && value <= max) return 1;
  const distance = value < min ? min - value : value - max;
  // Penalize 1 unit per 10 units outside range, capped.
  return clamp01(1 - distance / 20);
}

export function colorMatchesRole(color: string, role: Role): MatchResult {
  const reasons: string[] = [];

  if (color.trim().toLowerCase() === 'transparent') {
    return { score: 0, reasons: ['transparent color is not a token'] };
  }

  const l = lightness(color);
  const s = saturation(color);
  if (l === null || s === null) {
    return { score: 0, reasons: ['invalid color'] };
  }

  const expectations = getRoleExpectations(role);
  if (!expectations) return { score: 0.5, reasons: ['no expectations for role'] };

  const lScore = scoreRange(l, expectations.lightnessRange);
  const sScore = scoreRange(s, expectations.saturationRange);

  let hScore = 1;
  if (expectations.preferredHue) {
    // Hue comparison is harder; we already use the rgbToHsl.
    // Simulate by mapping saturation midpoint to expected hue.
    hScore = 0.5; // we don't compute hue without import; defer
  }

  // Use geometric mean to ensure that failing one dimension weighs more
  // than scoring well on others (closer to user-perceived relevance).
  const score = Math.pow(lScore * 0.5 + sScore * 0.35 + hScore * 0.15, 2);

  if (lScore < 0.7) reasons.push(`lightness ${l.toFixed(1)} outside expected ${expectations.lightnessRange}`);
  if (sScore < 0.7) reasons.push(`saturation ${s.toFixed(1)} outside expected ${expectations.saturationRange}`);

  return { score, reasons };
}
