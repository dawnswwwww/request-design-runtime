import { describe, test, expect } from 'bun:test';
import {
  normalizeColor,
  hexToRgb,
  rgbToLab,
  labDistance,
  groupColorsByLabTolerance,
} from '../../src/utils/colors';

describe('color utilities', () => {
  describe('normalizeColor', () => {
    test('returns hex as uppercase hex', () => {
      expect(normalizeColor('#fff')).toBe('#FFFFFF');
      expect(normalizeColor('#FF5733')).toBe('#FF5733');
    });

    test('converts rgb to hex', () => {
      expect(normalizeColor('rgb(255, 87, 51)')).toBe('#FF5733');
    });

    test('converts rgba to hex ignoring alpha', () => {
      expect(normalizeColor('rgba(255, 87, 51, 0.5)')).toBe('#FF5733');
    });

    test('converts hsl to hex', () => {
      expect(normalizeColor('hsl(0, 100%, 50%)')).toBe('#FF0000');
      expect(normalizeColor('hsl(120, 100%, 50%)')).toBe('#00FF00');
    });

    test('returns empty string for unsupported formats', () => {
      expect(normalizeColor('invalid')).toBe('');
      expect(normalizeColor('')).toBe('');
    });
  });

  describe('hexToRgb', () => {
    test('converts 3 and 6 digit hex', () => {
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#FF5733')).toEqual({ r: 255, g: 87, b: 51 });
    });
  });

  describe('rgbToLab', () => {
    test('white maps to near-zero lab', () => {
      const lab = rgbToLab({ r: 255, g: 255, b: 255 });
      expect(lab.l).toBeGreaterThan(99);
      expect(Math.abs(lab.a)).toBeLessThan(1);
      expect(Math.abs(lab.b)).toBeLessThan(1);
    });

    test('black maps to near-zero l', () => {
      const lab = rgbToLab({ r: 0, g: 0, b: 0 });
      expect(lab.l).toBeLessThan(1);
    });
  });

  describe('labDistance', () => {
    test('distance from same color is 0', () => {
      const lab = rgbToLab({ r: 100, g: 100, b: 100 });
      expect(labDistance(lab, lab)).toBe(0);
    });

    test('distance increases for different colors', () => {
      const white = rgbToLab({ r: 255, g: 255, b: 255 });
      const black = rgbToLab({ r: 0, g: 0, b: 0 });
      expect(labDistance(white, black)).toBeGreaterThan(100);
    });
  });

  describe('groupColorsByLabTolerance', () => {
    test('groups nearly identical colors', () => {
      const colors = ['#FFFFFF', '#ffffff', '#FFFFFE'];
      const groups = groupColorsByLabTolerance(colors, 0.03);
      expect(groups.length).toBe(1);
    });

    test('separates clearly different colors', () => {
      const colors = ['#FFFFFF', '#000000', '#FF0000'];
      const groups = groupColorsByLabTolerance(colors, 0.03);
      expect(groups.length).toBe(3);
    });
  });
});
