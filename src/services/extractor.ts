export interface ComputedStyleSample {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  padding?: string;
  margin?: string;
  gap?: string;
  boxShadow?: string;
}

export interface RawTokens {
  colors: string[];
  typography: Array<{
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
  }>;
  spacing: string[];
  radius: string[];
  shadows: string[];
}

function collectUnique(values: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const v of values) {
    if (v && v !== 'transparent' && v !== 'rgba(0, 0, 0, 0)' && v !== 'none') {
      seen.add(v);
    }
  }
  return Array.from(seen);
}

export function extractTokens(samples: ComputedStyleSample[]): RawTokens {
  const colors: string[] = [];
  const typography: RawTokens['typography'] = [];
  const spacing: string[] = [];
  const radius: string[] = [];
  const shadows: string[] = [];

  for (const sample of samples) {
    if (sample.color) colors.push(sample.color);
    if (sample.backgroundColor) colors.push(sample.backgroundColor);
    if (sample.borderColor) colors.push(sample.borderColor);

    if (sample.fontFamily) {
      typography.push({
        fontFamily: sample.fontFamily,
        fontSize: sample.fontSize || '16px',
        fontWeight: sample.fontWeight || '400',
        lineHeight: sample.lineHeight || 'normal',
        letterSpacing: sample.letterSpacing || 'normal',
      });
    }

    if (sample.padding) spacing.push(sample.padding);
    if (sample.margin) spacing.push(sample.margin);
    if (sample.gap) spacing.push(sample.gap);

    if (sample.borderRadius) radius.push(sample.borderRadius);
    if (sample.boxShadow) shadows.push(sample.boxShadow);
  }

  return {
    colors: collectUnique(colors),
    typography,
    spacing: collectUnique(spacing),
    radius: collectUnique(radius),
    shadows: collectUnique(shadows),
  };
}
