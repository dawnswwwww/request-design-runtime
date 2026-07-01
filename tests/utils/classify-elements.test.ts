import { describe, test, expect } from 'bun:test';
import { classifySample, classifyRole, looksLikePrimary } from '../../src/utils/classify-elements';

describe('classifyRole', () => {
  test('classifies interactive element', () => {
    const role = classifyRole('A', 'nav-link', 'navigation', { inNav: true, looksLikePrimary: false });
    expect(role).toBe('nav-link');
  });

  test('classifies primary button', () => {
    const role = classifyRole('BUTTON', 'btn btn-primary', null, { inNav: false, looksLikePrimary: true });
    expect(role).toBe('button-primary');
  });

  test('classifies secondary button', () => {
    const role = classifyRole('BUTTON', 'btn', null, { inNav: false, looksLikePrimary: false });
    expect(role).toBe('button-secondary');
  });

  test('classifies card', () => {
    const role = classifyRole('DIV', 'card', null, { inNav: false, looksLikePrimary: false });
    expect(role).toBe('card');
  });

  test('classifies heading', () => {
    expect(classifyRole('H1', '', null, {})).toBe('heading');
    expect(classifyRole('H2', '', null, {})).toBe('heading');
  });

  test('classifies body', () => {
    expect(classifyRole('P', '', null, {})).toBe('body');
    expect(classifyRole('LI', '', null, {})).toBe('body');
  });
});

describe('looksLikePrimary', () => {
  test('matches common primary class patterns', () => {
    expect(looksLikePrimary('btn-primary')).toBe(true);
    expect(looksLikePrimary('cta-button')).toBe(true);
    expect(looksLikePrimary('primary-action')).toBe(true);
    expect(looksLikePrimary('hero-cta')).toBe(true);
  });

  test('ignores non-primary patterns', () => {
    expect(looksLikePrimary('btn-secondary')).toBe(false);
    expect(looksLikePrimary('link')).toBe(false);
  });
});

describe('classifySample', () => {
  test('extracts semantic info from class string', () => {
    const sample = classifySample({
      tag: 'BUTTON',
      className: 'btn btn-primary',
      role: null,
      inNav: false,
      inHeader: false,
      inMain: true,
    });
    expect(sample.tag).toBe('BUTTON');
    expect(sample.looksLikePrimary).toBe(true);
    expect(sample.role2).toBe('button-primary');
  });

  test('detects interactive elements', () => {
    const sample = classifySample({
      tag: 'A',
      className: 'link',
      role: null,
      inNav: true,
      inHeader: false,
      inMain: false,
    });
    expect(sample.isInteractive).toBe(true);
    expect(sample.inNav).toBe(true);
  });

  test('captures card context', () => {
    const sample = classifySample({
      tag: 'DIV',
      className: 'card-body',
      role: null,
      inNav: false,
      inHeader: false,
      inMain: true,
    });
    expect(sample.role2).toBe('card');
  });
});
