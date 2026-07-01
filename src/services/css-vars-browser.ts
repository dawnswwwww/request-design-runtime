/**
 * Browser-side CSS variable collector with full chain resolution.
 *
 * Reads every --* from every stylesheet, builds a name → value map, then
 * recursively resolves var(...) references to a final string.
 */
export const CSS_VAR_RESOLVE_SCRIPT = `(function() {
  // 1. Collect every --* from stylesheets (no resolution here)
  const rawVars = new Map();
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      const walk = (rule) => {
        if (!rule) return;
        // CSSStyleRule
        if (rule.style) {
          for (const prop of Array.from(rule.style)) {
            if (prop.startsWith('--')) {
              rawVars.set(prop, rule.style.getPropertyValue(prop).trim());
            }
          }
        }
        // CSSMediaRule etc.
        if (rule.cssRules) {
          for (const r of Array.from(rule.cssRules)) walk(r);
        }
        // CSSKeyframesRule doesn't have a style map; skip.
      };
      for (const r of Array.from(rules)) walk(r);
    }
  } catch (e) {}

  // 2. Recursively resolve var() chains to a non-var final value (max depth 10)
  const resolveCssVar = (value, seen, depth) => {
    if (depth > 10) return value;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (trimmed.indexOf('var(') !== 0) return value;
    // Match: var(--name) or var(--name, fallback)
    const open = trimmed.indexOf('(');
    const close = trimmed.lastIndexOf(')');
    if (open < 0 || close < 0 || close < open) return value;
    const inner = trimmed.slice(open + 1, close);
    const comma = inner.indexOf(',');
    const name = (comma >= 0 ? inner.slice(0, comma) : inner).trim();
    if (!name.startsWith('--')) {
      // It's a fallback like var(red, blue)
      return comma >= 0 ? inner.slice(comma + 1).trim() : value;
    }
    if (seen.has(name)) return value;
    seen.add(name);
    const next = rawVars.get(name);
    if (!next) {
      return comma >= 0 ? inner.slice(comma + 1).trim() : value;
    }
    return resolveCssVar(next, seen, depth + 1);
  };

  // 3. Materialize resolved map
  const resolvedVars = {};
  for (const [k, v] of rawVars.entries()) {
    const seen = new Set();
    resolvedVars[k] = resolveCssVar(v, seen, 0);
  }

  // 4. Collect style samples (semantic + computed)
  const samples = [];
  for (const el of Array.from(document.querySelectorAll('body, body *'))) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const style = window.getComputedStyle(el);
    samples.push({
      tag: el.tagName,
      className: el.getAttribute('class') || '',
      role: el.getAttribute('role'),
      inNav: !!el.closest('nav, [role=\"navigation\"]'),
      inHeader: !!el.closest('header'),
      inMain: !!el.closest('main'),
      textSample: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30),
      style: {
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        padding: style.padding,
        boxShadow: style.boxShadow,
      },
    });
  }
  return JSON.stringify({ samples: samples.slice(0, 500), cssVars: resolvedVars });
})();`;

export const CSS_VAR_LIGHT_SCRIPT = `(function() {
  // Lightweight resolver for debugging / smoke tests.
  const out = new Map();
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      const walk = (rule) => {
        if (rule.style) {
          for (const prop of Array.from(rule.style)) {
            if (prop.startsWith('--')) {
              out.set(prop, rule.style.getPropertyValue(prop).trim());
            }
          }
        }
        if (rule.cssRules) for (const r of Array.from(rule.cssRules)) walk(r);
      };
      for (const r of Array.from(rules)) walk(r);
    }
  } catch (e) {}
  const resolveCssVar = (value, seen, depth) => {
    if (depth > 10 || typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (trimmed.indexOf('var(') !== 0) return value;
    const open = trimmed.indexOf('(');
    const close = trimmed.lastIndexOf(')');
    if (open < 0 || close < 0 || close < open) return value;
    const inner = trimmed.slice(open + 1, close);
    const comma = inner.indexOf(',');
    const name = (comma >= 0 ? inner.slice(0, comma) : inner).trim();
    if (!name.startsWith('--')) {
      return comma >= 0 ? inner.slice(comma + 1).trim() : value;
    }
    if (seen.has(name)) return value;
    seen.add(name);
    const next = out.get(name);
    if (!next) {
      return comma >= 0 ? inner.slice(comma + 1).trim() : value;
    }
    return resolveCssVar(next, seen, depth + 1);
  };
  const resolved = {};
  for (const [k, v] of out.entries()) resolved[k] = resolveCssVar(v, new Set(), 0);
  return JSON.stringify(resolved);
})();`;
