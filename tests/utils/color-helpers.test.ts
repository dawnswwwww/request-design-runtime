import { describe, test, expect } from 'bun:test';
import {
  parseColorToRgb,
  rgbToHsl,
  lightness,
  saturation,
  hue,
  colorDistance,
} from '../../src/utils/color-helpers';

describe('parseColorToRgb', () => {
  test('parses 6-digit hex', () => {
    expect(parseColorToRgb('#3B82F6')).toEqual({ r: 59, g: 130, b: 246 });
  });

  test('parses 3-digit hex', () => {
    expect(parseColorToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
  });

  test('parses rgb() string', () => {
    expect(parseColorToRgb('rgb(255, 87, 51)')).toEqual({ r: 255, g: 87, b: 51 });
  });

  test('parses rgba() string ignoring alpha', () => {
    expect(parseColorToRgb('rgba(0, 0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('parses hsl() string', () => {
    const result = parseColorToRgb('hsl(0, 100%, 50%)');
    expect(result.r).toBe(255);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  test('returns null for transparent', () => {
    expect(parseColorToRgb('transparent')).toBeNull();
  });

  test('returns null for invalid input', () => {
    expect(parseColorToRgb('garbage')).toBeNull();
    expect(parseColorToRgb('')).toBeNull();
  });

  test('handles mixed case hex', () => {
    expect(parseColorToRgb('#Ff5733')).toEqual({ r: 255, g: 87, b: 51 });
  });
});

describe('rgbToHsl', () => {
  test('white has 0 saturation and 100 lightness', () => {
    const hsl = rgbToHsl({ r: 255, g: 255, b: 255 });
    expect(hsl.s).toBeCloseTo(0, 1);
    expect(hsl.l).toBeCloseTo(100, 1);
  });

  test('black has 0 lightness', () => {
    const hsl = rgbToHsl({ r: 0, g: 0, b: 0 });
    expect(hsl.l).toBeCloseTo(0, 1);
  });

  test('pure red is hue 0', () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBeCloseTo(0, 0);
  });
});

describe('lightness', () => {
  test('returns 0-100 lightness', () => {
    expect(lightness('#FFFFFF')).toBe(100);
    expect(lightness('#000000')).toBe(0);
  });

  test('returns null for transparent', () => {
    expect(lightness('rgba(0,0,0,0)')).toBeLessThan(5);
  });
});

describe('saturation', () => {
  test('returns 0 for greyscale', () => {
    expect(saturation('#888888')).toBeCloseTo(0, 1);
  });

  test('returns close to 100 for pure colors', () => {
    expect(saturation('#FF0000')).toBeGreaterThan(95);
    expect(saturation('#00FF00')).toBeGreaterThan(95);
  });
});

describe('hue', () => {
  test('red is ~0', () => {
    expect(hue('#FF0000')).toBeGreaterThanOrEqual(0);
    expect(hue('#FF0000')).toBeLessThan(20);
  });

  test('cyan is ~180', () => {
    expect(hue('#00FFFF')).toBeGreaterThan(170);
    expect(hue('#00FFFF')).toBeLessThan(200);
  });

  test('blue is ~240', () => {
    expect(hue('#0000FF')).toBeGreaterThan(220);
    expect(hue('#0000FF')).toBeLessThan(260);
  });
});

describe('colorDistance', () => {
  test('identical colors have distance 0', () => {
    expect(colorDistance('#3B82F6', '#3B82F6')).toBe(0);
  });

  test('close colors have small distance', () => {
    expect(colorDistance('#3B82F6', '#3B82F7')).toBeLessThan(2);
  });

  test('opposite colors have distance ~100', () => {
    const d = colorDistance('#FFFFFF', '#000000');
    expect(d).toBeGreaterThan(80);
  });
});
