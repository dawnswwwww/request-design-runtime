import { colorDistance } from '../utils/color-helpers';

export interface RenderSample {
  selector: string;
  computedBg: string;
  cssVarResolvesTo: string;
}

export interface RenderCheckResult {
  score: number;
  matched: number;
  mismatched: number;
  reasons: string[];
}

export function evalRenderConsistency(samples: RenderSample[]): RenderCheckResult {
  if (samples.length === 0) {
    return { score: 0.5, matched: 0, mismatched: 0, reasons: ['no samples'] };
  }

  let matched = 0;
  let mismatched = 0;
  const reasons: string[] = [];

  for (const sample of samples) {
    const distance = colorDistance(sample.computedBg, sample.cssVarResolvesTo);
    if (distance < 5) {
      matched += 1;
    } else {
      mismatched += 1;
      reasons.push(`${sample.selector}: computed=${sample.computedBg} vs var=${sample.cssVarResolvesTo} (Δ=${distance.toFixed(1)})`);
    }
  }

  const score = matched / (matched + mismatched);
  return { score, matched, mismatched, reasons };
}

/**
 * Browser-side EXTRACTION helper. Returns JSON string the page can use to
 * record observed vs resolved-at-button values for a known CSS variable.
 */
export const BROWSER_RENDER_CHECK_SCRIPT = `(function() {
  const checks = [];
  for (const el of document.querySelectorAll('button, a.btn, .btn, [class*="button"], [class*="cta"]')) {
    const computed = window.getComputedStyle(el).backgroundColor;
    const css = window.getComputedStyle(el);
    let cssVarResolvesTo = '';
    for (const prop of el.style) {
      if (prop.startsWith('--')) {
        cssVarResolvesTo = css.getPropertyValue(prop).trim();
        if (cssVarResolvesTo) break;
      }
    }
    checks.push({ selector: el.tagName + '.' + (el.className || ''), computedBg: computed, cssVarResolvesTo: cssVarResolvesTo });
    if (checks.length >= 5) break;
  }
  return JSON.stringify(checks);
})();`;
