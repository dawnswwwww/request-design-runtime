export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function parseColorToRgb(input: string): Rgb | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === 'transparent' || trimmed === 'none') return null;

  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6) return null;
    const num = Number.parseInt(hex, 16);
    if (Number.isNaN(num)) return null;
    return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
  }

  if (trimmed.startsWith('rgba(') && /\b0\s*,\s*0\s*,\s*0\s*,\s*0(?:\s|$)/.test(trimmed)) {
    return null;
  }

  const rgbaMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    return {
      r: Number.parseInt(rgbaMatch[1], 10),
      g: Number.parseInt(rgbaMatch[2], 10),
      b: Number.parseInt(rgbaMatch[3], 10),
    };
  }

  const hslMatch = trimmed.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/);
  if (hslMatch) {
    return hslToRgb(
      Number.parseInt(hslMatch[1], 10) / 360,
      Number.parseInt(hslMatch[2], 10) / 100,
      Number.parseInt(hslMatch[3], 10) / 100
    );
  }

  return null;
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return {
    r: Math.round(hue2rgb(h + 1 / 3) * 255),
    g: Math.round(hue2rgb(h) * 255),
    b: Math.round(hue2rgb(h - 1 / 3) * 255),
  };
}

export function rgbToHsl(rgb: Rgb): Hsl {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let h = 0;
  const delta = max - min;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
      h = ((b - r) / delta + 2) * 60;
    } else {
      h = ((r - g) / delta + 4) * 60;
    }
  }
  return { h, s: s * 100, l: l * 100 };
}

export function lightness(input: string): number | null {
  if (input.trim().toLowerCase() === 'transparent') return null;
  const rgb = parseColorToRgb(input);
  if (!rgb) return null;
  return rgbToHsl(rgb).l;
}

export function saturation(input: string): number | null {
  if (input.trim().toLowerCase() === 'transparent') return null;
  const rgb = parseColorToRgb(input);
  if (!rgb) return null;
  return rgbToHsl(rgb).s;
}

export function hue(input: string): number | null {
  if (input.trim().toLowerCase() === 'transparent') return null;
  const rgb = parseColorToRgb(input);
  if (!rgb) return null;
  return rgbToHsl(rgb).h;
}

export function colorDistance(a: string, b: string): number {
  const rgbA = parseColorToRgb(a);
  const rgbB = parseColorToRgb(b);
  if (!rgbA || !rgbB) return 100;
  const dr = rgbA.r - rgbB.r;
  const dg = rgbA.g - rgbB.g;
  const db = rgbA.b - rgbB.b;
  // Weighted Euclidean distance, capped to 100.
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  return Math.min(100, dist / 4.4);
}
