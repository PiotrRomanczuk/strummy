import type {
  CollectionQuality,
  QualityBand,
  QualityProfile,
  QualityRule,
  RecordQuality,
  RuleContext,
  RuleSummary,
} from './quality.types';

/** A record failing any critical rule cannot score above this. */
export const CRITICAL_CAP = 40;
export const GOOD_THRESHOLD = 85;
export const FAIR_THRESHOLD = 60;

export function bandFor(score: number): QualityBand {
  if (score >= GOOD_THRESHOLD) return 'good';
  if (score >= FAIR_THRESHOLD) return 'fair';
  return 'poor';
}

export function buildContext<T>(
  profile: QualityProfile<T>,
  records: T[],
  now: Date = new Date()
): RuleContext {
  const identityCounts = new Map<string, number>();
  if (profile.identityOf) {
    for (const record of records) {
      const key = profile.identityOf(record);
      if (key) identityCounts.set(key, (identityCounts.get(key) ?? 0) + 1);
    }
  }
  return { now, identityCounts };
}

type Evaluation<T> = { rule: QualityRule<T>; passed: boolean };

function evaluate<T>(profile: QualityProfile<T>, record: T, ctx: RuleContext): Evaluation<T>[] {
  return profile.rules
    .filter((rule) => !rule.appliesTo || rule.appliesTo(record, ctx))
    .map((rule) => ({ rule, passed: rule.check(record, ctx) }));
}

export function scoreRecord<T extends { id: string }>(
  profile: QualityProfile<T>,
  record: T,
  ctx: RuleContext
): RecordQuality {
  const evaluations = evaluate(profile, record, ctx);
  const totalWeight = evaluations.reduce((sum, e) => sum + e.rule.weight, 0);
  const passedWeight = evaluations.reduce((sum, e) => sum + (e.passed ? e.rule.weight : 0), 0);
  const failed = evaluations.filter((e) => !e.passed).map((e) => e.rule);
  const hasCriticalFailure = failed.some((rule) => rule.isCritical);

  const raw = totalWeight === 0 ? 100 : Math.round((100 * passedWeight) / totalWeight);
  const score = hasCriticalFailure ? Math.min(raw, CRITICAL_CAP) : raw;

  return {
    id: record.id,
    score,
    band: bandFor(score),
    failedRuleIds: failed
      .sort((a, b) => Number(!!b.isCritical) - Number(!!a.isCritical) || b.weight - a.weight)
      .map((rule) => rule.id),
    hasCriticalFailure,
  };
}

function summariseRules<T>(
  profile: QualityProfile<T>,
  records: T[],
  ctx: RuleContext
): RuleSummary[] {
  return profile.rules
    .map((rule) => {
      const applicable = records.filter((r) => !rule.appliesTo || rule.appliesTo(r, ctx));
      const failing = applicable.filter((r) => !rule.check(r, ctx)).length;
      return {
        ruleId: rule.id,
        dimension: rule.dimension,
        weight: rule.weight,
        isCritical: !!rule.isCritical,
        failing,
        applicable: applicable.length,
        // Critical failures cap the whole score, so they jump the queue.
        impact: failing * rule.weight * (rule.isCritical ? 10 : 1),
      };
    })
    .filter((summary) => summary.failing > 0)
    .sort((a, b) => b.impact - a.impact);
}

export function scoreCollection<T extends { id: string }>(
  profile: QualityProfile<T>,
  records: T[],
  now: Date = new Date()
): CollectionQuality {
  const ctx = buildContext(profile, records, now);
  const scored = records.map((record) => scoreRecord(profile, record, ctx));
  const bands: Record<QualityBand, number> = { good: 0, fair: 0, poor: 0 };
  for (const r of scored) bands[r.band] += 1;
  const sum = scored.reduce((acc, r) => acc + r.score, 0);

  return {
    total: scored.length,
    averageScore: scored.length === 0 ? 100 : Math.round(sum / scored.length),
    bands,
    records: scored.sort((a, b) => a.score - b.score),
    fixQueue: summariseRules(profile, records, ctx),
  };
}
