import { nameMatchScore, isShadeVariant, type Role } from './css-name-match';
import { colorMatchesRole } from './color-expectations';

export interface ConfidenceFactors {
  nameMatch: number;
  colorMatch: number;
  consistent: number;
  shade: boolean;
}

export interface VariableConfidence {
  score: number;
  factors: ConfidenceFactors;
  reasons: string[];
}

export function scoreVariable(
  variableName: string,
  value: string,
  assignedRole: Role
): VariableConfidence {
  const factors: ConfidenceFactors = {
    nameMatch: 0,
    colorMatch: 0,
    consistent: 1,
    shade: isShadeVariant(variableName),
  };

  const reasons: string[] = [];
  const nameInfo = nameMatchScore(variableName);

  factors.nameMatch = nameInfo.score;
  if (factors.nameMatch < 0.5) {
    reasons.push(`variable name "${variableName}" does not match role "${assignedRole}" strongly`);
  }

  const colorResult = colorMatchesRole(value, assignedRole);
  factors.colorMatch = colorResult.score;
  reasons.push(...colorResult.reasons);

  if (factors.shade) {
    reasons.push(`variable "${variableName}" appears to be a shade variant (-50/100/700), not base`);
  }

  const score = computeScore(factors);

  return { score, factors, reasons };
}

export function scoreVariableAcrossPages(
  variableName: string,
  values: string[],
  assignedRole: Role
): VariableConfidence {
  // Score per page; aggregate by weighting unique-value consistency.
  const perPage = values.map((v) => scoreVariable(variableName, v, assignedRole));

  const unique = new Set(values.filter(Boolean));
  const consistency = unique.size <= 1 ? 1 : Math.max(0.2, 1 - (unique.size - 1) / 5);

  const avgScore = perPage.reduce((sum, p) => sum + p.score, 0) / Math.max(1, perPage.length);

  const factors: ConfidenceFactors = {
    nameMatch: perPage[0]?.factors.nameMatch || 0,
    colorMatch: perPage[0]?.factors.colorMatch || 0,
    consistent: consistency,
    shade: perPage[0]?.factors.shade || false,
  };

  const reasons: string[] = [];
  if (unique.size > 1) {
    reasons.push(`variable "${variableName}" had ${unique.size} distinct values across pages`);
  }

  // Penalize variance: if same variable gives wildly different scores across pages, drop further.
  const variancePenalty = Math.max(0, 1 - (unique.size - 1) * 0.4);
  const score = computeScore(factors) * variancePenalty;

  return { score, factors, reasons };
}

function computeScore(factors: ConfidenceFactors): number {
  // Shade variants always score low (they're not base tokens).
  if (factors.shade) {
    return Math.min(factors.nameMatch, 0.2);
  }
  // Weighted geometric mean. Weights:
  //   nameMatch   0.4  (so it can't be saved by color)
  //   colorMatch  0.35
  //   consistent  0.25
  const raw =
    Math.pow(Math.max(0.01, factors.nameMatch), 0.4) *
    Math.pow(Math.max(0.01, factors.colorMatch), 0.35) *
    Math.pow(Math.max(0.01, factors.consistent), 0.25);
  return Math.min(1, raw * 1.3);
}

export function isHighConfidence(c: VariableConfidence): boolean {
  return c.score >= 0.7;
}
