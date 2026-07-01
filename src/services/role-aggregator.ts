import type { Role, SampleSemantic } from '../utils/classify-elements';

export interface StyleSnapshot {
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  padding: string;
  boxShadow: string;
}

export interface EnrichedSample {
  semantic: SampleSemantic;
  style: StyleSnapshot;
}

export interface RoleAggregate {
  role: Role;
  count: number;
  style: StyleSnapshot;
  sources: string[];
}

export interface AggregateResult {
  totals: number;
  byRole: Partial<Record<Role, RoleAggregate>>;
}

function mostCommon<T>(values: T[]): T | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<T, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best: T | undefined;
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export function aggregateByRole(samples: EnrichedSample[]): AggregateResult {
  const byRole: Partial<Record<Role, RoleAggregate>> = {};

  for (const sample of samples) {
    const role = sample.semantic.role2;
    if (!role) continue;

    const existing = byRole[role];
    if (existing) {
      existing.count += 1;
      const text = sample.semantic.textSample;
      if (text && !existing.sources.includes(text)) {
        existing.sources.push(text);
      }
    } else {
      byRole[role] = {
        role,
        count: 1,
        style: { ...sample.style },
        sources: sample.semantic.textSample ? [sample.semantic.textSample] : [],
      };
    }
  }

  // Recompute most-common values per role.
  for (const role of Object.keys(byRole) as Role[]) {
    const aggregate = byRole[role];
    if (!aggregate) continue;
    const roleSamples = samples.filter((s) => s.semantic.role2 === role);
    const keys = Object.keys(aggregate.style) as (keyof StyleSnapshot)[];
    for (const key of keys) {
      const values = roleSamples.map((s) => s.style[key]).filter(Boolean);
      const mode = mostCommon(values);
      if (mode !== undefined) {
        aggregate.style[key] = mode;
      }
    }
  }

  return {
    totals: samples.length,
    byRole,
  };
}
