import { aggregateByRole, type AggregateResult, type StyleSnapshot } from './role-aggregator';
import type { EnrichedSample } from './role-aggregator';
import type { Role } from '../utils/classify-elements';

const COMPONENT_ROLES: Role[] = [
  'button-primary',
  'button-secondary',
  'input',
  'card',
  'nav-link',
];

export interface ComponentTokens {
  backgroundColor?: string;
  color?: string;
  borderColor?: string;
  borderRadius?: string;
  padding?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  boxShadow?: string;
  count: number;
  sources: string[];
}

export type Components = Partial<Record<Role, ComponentTokens>>;

export function extractComponents(
  samples: EnrichedSample[],
  aggregate?: AggregateResult
): Components {
  const agg = aggregate || aggregateByRole(samples);
  const out: Components = {};

  for (const role of COMPONENT_ROLES) {
    const roleAgg = agg.byRole[role];
    if (!roleAgg) continue;

    const roleSamples = samples.filter((s) => s.semantic.role2 === role);

    out[role] = {
      backgroundColor: roleAgg.style.backgroundColor || undefined,
      color: roleAgg.style.color || undefined,
      borderColor: roleAgg.style.borderColor || undefined,
      borderRadius: roleAgg.style.borderRadius || undefined,
      padding: roleAgg.style.padding || undefined,
      fontSize: roleAgg.style.fontSize || undefined,
      fontWeight: roleAgg.style.fontWeight || undefined,
      fontFamily: roleAgg.style.fontFamily || undefined,
      boxShadow: roleAgg.style.boxShadow || undefined,
      count: roleSamples.length || roleAgg.count,
      sources: roleAgg.sources.slice(0, 5),
    };
  }

  return out;
}