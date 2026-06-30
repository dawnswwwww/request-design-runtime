import { describe, test, expect } from 'bun:test';
import { extractTokens } from '../../src/services/extractor';

describe('extractor', () => {
  test('extracts colors from computed styles', () => {
    const styles = [
      { color: '#000000', backgroundColor: '#FFFFFF', borderColor: '#3B82F6', fontSize: '16px', fontFamily: 'Inter' },
      { color: '#FFFFFF', backgroundColor: '#3B82F6', borderColor: 'transparent', fontSize: '14px', fontFamily: 'Inter' },
    ];

    const tokens = extractTokens(styles as never);
    expect(tokens.colors).toContain('#000000');
    expect(tokens.colors).toContain('#FFFFFF');
    expect(tokens.colors).toContain('#3B82F6');
  });

  test('extracts typography values', () => {
    const styles = [
      { color: '#000', backgroundColor: '#FFF', fontFamily: 'Inter, sans-serif', fontSize: '32px', fontWeight: '700', lineHeight: '1.2', letterSpacing: '-0.02em' },
      { color: '#000', backgroundColor: '#FFF', fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '1.5' },
    ];

    const tokens = extractTokens(styles as never);
    expect(tokens.typography.map((t) => t.fontSize)).toContain('32px');
    expect(tokens.typography.map((t) => t.fontSize)).toContain('16px');
  });

  test('extracts spacing values', () => {
    const styles = [
      { padding: '16px', margin: '24px', gap: '8px' },
    ];

    const tokens = extractTokens(styles as never);
    expect(tokens.spacing).toContain('16px');
    expect(tokens.spacing).toContain('24px');
    expect(tokens.spacing).toContain('8px');
  });

  test('extracts border radius values', () => {
    const styles = [
      { borderRadius: '8px' },
      { borderRadius: '9999px' },
    ];

    const tokens = extractTokens(styles as never);
    expect(tokens.radius).toContain('8px');
    expect(tokens.radius).toContain('9999px');
  });

  test('extracts shadows', () => {
    const styles = [
      { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    ];

    const tokens = extractTokens(styles as never);
    expect(tokens.shadows).toContain('0 4px 6px rgba(0,0,0,0.1)');
  });
});
