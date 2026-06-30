export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}

export function normalizeColor(value: string): string {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.startsWith('#')) {
    const rgb = hexToRgb(trimmed);
    if (!rgb) return '';
    return rgbToHex(rgb);
  }

  if (trimmed.startsWith('rgb(') || trimmed.startsWith('rgba(')) {
    const rgb = parseRgb(trimmed);
    if (!rgb) return '';
    return rgbToHex(rgb);
  }

  if (trimmed.startsWith('hsl(') || trimmed.startsWith('hsla(')) {
    const rgb = hslToRgb(trimmed);
    if (!rgb) return '';
    return rgbToHex(rgb);
  }

  return '';
}

export function hexToRgb(hex: string): Rgb | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 3 && clean.length !== 6) return null;

  const expanded = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(expanded, 16);
  if (Number.isNaN(num)) return null;

  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function rgbToHex(rgb: Rgb): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function parseRgb(value: string): Rgb | null {
  const match = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return null;
  return {
    r: Number.parseInt(match[1], 10),
    g: Number.parseInt(match[2], 10),
    b: Number.parseInt(match[3], 10),
  };
}

function hslToRgb(value: string): Rgb | null {
  const match = value.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/);
  if (!match) return null;
  const h = Number.parseInt(match[1], 10) / 360;
  const s = Number.parseInt(match[2], 10) / 100;
  const l = Number.parseInt(match[3], 10) / 100;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function rgbToLab(rgb: Rgb): Lab {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1.0;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116);

  return {
    l: 116 * f(y) - 16,
    a: 500 * (f(x) - f(y)),
    b: 200 * (f(y) - f(z)),
  };
}

export function labDistance(a: Lab, b: Lab): number {
  return Math.sqrt(
    Math.pow(a.l - b.l, 2) + Math.pow(a.a - b.a, 2) + Math.pow(a.b - b.b, 2)
  );
}

export function groupColorsByLabTolerance(colors: string[], tolerance: number): string[][] {
  const normalized = colors.map(normalizeColor).filter(Boolean);
  const groups: string[][] = [];

  for (const color of normalized) {
    const lab = rgbToLab(hexToRgb(color)!);
    let placed = false;

    for (const group of groups) {
      const firstLab = rgbToLab(hexToRgb(group[0])!);
      const dist = labDistance(lab, firstLab);
      const threshold = tolerance * 100;
      if (dist <= threshold) {
        group.push(color);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push([color]);
    }
  }

  return groups;
}
