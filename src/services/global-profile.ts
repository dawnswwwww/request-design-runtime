import { aggregateByRole, type AggregateResult, type StyleSnapshot } from './role-aggregator';
import type { Role } from '../utils/classify-elements';

export interface GlobalRoleToken {
  role: Role;
  style: StyleSnapshot;
  pagesWithRole: number;
  pageTotal: number;
  consistency: number;
  conflictingValues: StyleSnapshot | undefined;
  sources: string[];
  rawCount: number;
}

function fieldAgreement(reference: StyleSnapshot, others: StyleSnapshot[]): number {
  const keys = Object.keys(reference) as (keyof StyleSnapshot)[];
  let total = 0;
  let matched = 0;
  for (const key of keys) {
    const ref = reference[key];
    if (!ref) continue;
    for (const other of others) {
      total += 1;
      if (other[key] === ref) matched += 1;
    }
  }
  return total === 0 ? 1 : matched / total;
}

export interface FrequencyEntry<T> {
  value: T;
  count: number;
}

export interface GlobalProfile {
  pageCount: number;
  totals: number;
  byRole: Partial<Record<Role, GlobalRoleToken>>;
  colorFrequency: FrequencyEntry<string>[];
  fontFrequency: FrequencyEntry<string>[];
  radiusFrequency: FrequencyEntry<string>[];
  shadowFrequency: FrequencyEntry<string>[];
  cssVarTokens?: {
    colors: Record<string, string>;
    typography?: { family?: string };
    spacing?: Record<string, string>;
    radius?: Record<string, string>;
    source?: string;
  };
}

interface PageInput {
  url: string;
  samples: Parameters<typeof aggregateByRole>[0];
}

interface PerRoleAccumulator {
  role: Role;
  byPage: StyleSnapshot[];
  count: number;
  sources: Set<string>;
}

function mergeStyles(styles: StyleSnapshot[]): StyleSnapshot {
  const merged: StyleSnapshot = {
    color: '',
    backgroundColor: '',
    borderColor: '',
    borderRadius: '',
    fontFamily: '',
    fontSize: '',
    fontWeight: '',
    lineHeight: '',
    letterSpacing: '',
    padding: '',
    boxShadow: '',
  };

  const keys = Object.keys(merged) as (keyof StyleSnapshot)[];

  for (const key of keys) {
    const counts = new Map<string, number>();
    for (const style of styles) {
      const value = style[key];
      if (!value) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    let best: string | undefined;
    let bestCount = -1;
    for (const [value, count] of counts) {
      if (count > bestCount) {
        best = value;
        bestCount = count;
      }
    }
    if (best !== undefined) {
      merged[key] = best;
    }
  }

  return merged;
}

function conflictMap(reference: StyleSnapshot, others: StyleSnapshot[]): StyleSnapshot | undefined {
  const conflict: StyleSnapshot = {
    color: '',
    backgroundColor: '',
    borderColor: '',
    borderRadius: '',
    fontFamily: '',
    fontSize: '',
    fontWeight: '',
    lineHeight: '',
    letterSpacing: '',
    padding: '',
    boxShadow: '',
  };
  const keys = Object.keys(conflict) as (keyof StyleSnapshot)[];
  let hasConflict = false;
  for (const key of keys) {
    const referenceValue = reference[key];
    const conflicting: string[] = [];
    for (const other of others) {
      const value = other[key];
      if (value && value !== referenceValue) {
        conflicting.push(value);
      }
    }
    if (conflicting.length > 0) {
      hasConflict = true;
      const counts = new Map<string, number>();
      for (const v of conflicting) counts.set(v, (counts.get(v) || 0) + 1);
      let best: string | undefined;
      let bestCount = -1;
      for (const [value, count] of counts) {
        if (count > bestCount) {
          best = value;
          bestCount = count;
        }
      }
      if (best) conflict[key] = best;
    }
  }
  return hasConflict ? conflict : undefined;
}

function buildFrequency<T extends 'string'>(
  count: Map<string, number>
): FrequencyEntry<string>[] {
  return Array.from(count.entries())
    .map(([value, freq]) => ({ value, count: freq }))
    .sort((a, b) => b.count - a.count);
}

export function buildGlobalProfile(pages: PageInput[]): GlobalProfile {
  const totals = pages.reduce((sum, page) => sum + page.samples.length, 0);
  const accumulators = new Map<Role, PerRoleAccumulator>();
  const colorCount = new Map<string, number>();
  const fontCount = new Map<string, number>();
  const radiusCount = new Map<string, number>();
  const shadowCount = new Map<string, number>();
  const samplesByPage: Map<string, AggregateResult> = new Map();

  for (const page of pages) {
    const agg = aggregateByRole(page.samples);
    samplesByPage.set(page.url, agg);
    for (const sample of page.samples) {
      if (sample.style.color) colorCount.set(sample.style.color, (colorCount.get(sample.style.color) || 0) + 1);
      if (sample.style.backgroundColor) colorCount.set(sample.style.backgroundColor, (colorCount.get(sample.style.backgroundColor) || 0) + 1);
      if (sample.style.borderColor && sample.style.borderColor !== 'rgba(0, 0, 0, 0)') {
        colorCount.set(sample.style.borderColor, (colorCount.get(sample.style.borderColor) || 0) + 1);
      }
      if (sample.style.fontFamily) fontCount.set(sample.style.fontFamily, (fontCount.get(sample.style.fontFamily) || 0) + 1);
      if (sample.style.borderRadius) radiusCount.set(sample.style.borderRadius, (radiusCount.get(sample.style.borderRadius) || 0) + 1);
      if (sample.style.boxShadow && sample.style.boxShadow !== 'none') shadowCount.set(sample.style.boxShadow, (shadowCount.get(sample.style.boxShadow) || 0) + 1);
    }
    for (const [role, roleAgg] of Object.entries(agg.byRole) as [Role, ReturnType<typeof aggregateByRole>['byRole'][Role]][]) {
      if (!roleAgg) continue;
      const existing = accumulators.get(role);
      if (existing) {
        existing.byPage.push(roleAgg.style);
        existing.count += roleAgg.count;
        for (const source of roleAgg.sources) {
          existing.sources.add(source);
        }
      } else {
        accumulators.set(role, {
          role,
          byPage: [roleAgg.style],
          count: roleAgg.count,
          sources: new Set(roleAgg.sources),
        });
      }
    }
  }

  const byRole: Partial<Record<Role, GlobalRoleToken>> = {};

  for (const [role, acc] of accumulators) {
    const merged = mergeStyles(acc.byPage);
    const [first, ...rest] = acc.byPage;
    const conflicting = first ? conflictMap(first, rest) : undefined;
    const consistency = first && rest.length > 0 ? fieldAgreement(first, rest) : 1;
    byRole[role] = {
      role,
      style: merged,
      pagesWithRole: acc.byPage.length,
      pageTotal: pages.length,
      consistency,
      conflictingValues: conflicting,
      sources: Array.from(acc.sources),
      rawCount: acc.count,
    };
  }

  return {
    pageCount: pages.length,
    totals,
    byRole,
    colorFrequency: buildFrequency(colorCount),
    fontFrequency: buildFrequency(fontCount),
    radiusFrequency: buildFrequency(radiusCount),
    shadowFrequency: buildFrequency(shadowCount),
  };
}
