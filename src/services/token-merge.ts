import { scoreVariable, type VariableConfidence } from './css-confidence';
import { isShadeVariant, type Role } from './css-name-match';
import type { DesignSystem } from './role-synthesizer';
import { mapCssVarToRole } from './css-vars-role-map';

function broaderRoleConfidence(name: string): string | null {
  return mapCssVarToRole(name) as unknown as string | null;
}

export interface RoleDecisionResult {
  decisions: TokenDecision[];
  rejected: Array<{ name: string; role: Role; value: string; score: number; reason: string }>;
}

export function applyDecisionsToDesignSystem(
  system: DesignSystem,
  result: RoleDecisionResult
): DesignSystem {
  const updated: DesignSystem = {
    ...system,
    colors: { ...system.colors },
    typography: { ...system.typography },
    spacing: { ...system.spacing },
    rounded: { ...system.rounded },
    shadows: [...system.shadows],
    metadata: { ...(system.metadata || {}) } as DesignSystem['metadata'],
  };

  const tokenSources: Record<string, 'css-var' | 'computed' | 'fallback'> = {};
  for (const decision of result.decisions) {
    const key = `colors.${decision.role}` as 'colors.primary';
    updated.colors[decision.role] = decision.value;
    tokenSources[decision.role] = decision.source;
    void key;
  }

  (updated.metadata as { tokenSources?: typeof tokenSources; rejectedCssVars?: typeof result.rejected }).tokenSources = tokenSources;
  (updated.metadata as { tokenSources?: typeof tokenSources; rejectedCssVars?: typeof result.rejected }).rejectedCssVars = result.rejected;

  return updated;
}

export interface CssTokenCandidate {
  name: string;
  value: string;
  assignedRole: Role;
  pages: number;
  renderConsistency: number;
}

export interface ComputedAnchor {
  role: Role;
  value: string;
}

export interface TokenDecision {
  role: Role;
  value: string;
  source: 'css-var' | 'computed' | 'fallback';
  confidence: VariableConfidence;
  reasons: string[];
  rejectedFromPrimary?: boolean;
}

export function buildCssTokenDecisions(
  computed: ComputedAnchor[],
  cssCandidates: CssTokenCandidate[]
): TokenDecision[] {
  const decisions: TokenDecision[] = [];

  const computedByRole = new Map<Role, string>();
  for (const c of computed) computedByRole.set(c.role, c.value);

  for (const cand of cssCandidates) {
    const shade = isShadeVariant(cand.name);
    const confidence = scoreVariable(cand.name, cand.value, cand.assignedRole);
    // Boost confidence if the broader role mapper confirms this is a real semantic token.
    if (broaderRoleConfidence(cand.name) === cand.assignedRole) {
      confidence.score = Math.min(1, confidence.score + 0.5);
      confidence.factors.nameMatch = Math.min(1, confidence.factors.nameMatch + 0.3);
    }
    confidence.factors.consistent = Math.min(1, cand.pages / 3);
    const renderScore = cand.renderConsistency;

    const integratedScore =
      confidence.score *
      Math.pow(Math.max(0.1, renderScore), 0.3);

    const effectiveRole: Role = shade ? remapShadeRole(cand.assignedRole, cand.name) : cand.assignedRole;

    const computedValue = computedByRole.get(effectiveRole);
    const computedAnchorStrength = computedValue ? 0.5 : 0.2;

    let source: TokenDecision['source'];
    let value: string;
    if (shade) {
      // For shade-demoted candidates, accept the css-var value as the new accent-*.
      source = 'css-var';
      value = cand.value;
    } else if (integratedScore > computedAnchorStrength) {
      source = 'css-var';
      value = cand.value;
    } else {
      source = 'computed';
      value = computedValue || cand.value;
    }

    decisions.push({
      role: effectiveRole,
      value,
      source,
      confidence,
      reasons: shade
        ? [...confidence.reasons, 'shade variant demoted from base role']
        : confidence.reasons,
      rejectedFromPrimary: shade && cand.assignedRole !== effectiveRole,
    });
  }

  // For roles where no CSS candidate exists, fall back to computed-only decisions.
  for (const [role, value] of computedByRole) {
    if (decisions.find((d) => d.role === role)) continue;
    decisions.push({
      role,
      value,
      source: 'fallback',
      confidence: {
        score: 0,
        factors: { nameMatch: 0, colorMatch: 0, consistent: 0, shade: false },
        reasons: ['no css-var candidate, computed-only'],
      },
      reasons: ['no css-var candidate, computed-only'],
    });
  }

  return decisions;
}

function remapShadeRole(original: Role, name: string): Role {
  const m = name.match(/[-_](\d{2,3})$/);
  const shadeNum = m ? parseInt(m[1], 10) : 0;
  if (shadeNum < 100) return 'accent-1';
  if (shadeNum < 400) return 'accent-2';
  return 'accent-3';
}
