/**
 * Data-quality profiles — shared shapes.
 *
 * A profile is a list of rules for one entity (song, lesson, student). Each rule
 * says whether it applies to a record and whether the record passes. The score
 * only counts rules that apply, so an empty field that is legitimately empty
 * (no tempo on a free-time ballad) never costs points.
 */

export type QualityDimension = 'completeness' | 'validity' | 'consistency' | 'uniqueness';

export type RuleWeight = 1 | 2 | 3 | 5;

/** Collection-wide facts a single-record rule cannot see (duplicates, "now"). */
export type RuleContext = {
  now: Date;
  /** Normalised identity key → how many records share it. */
  identityCounts: Map<string, number>;
};

export type QualityRule<T> = {
  /** Stable id, used in URLs (`?rule=song.key`) and i18n keys. Never rename. */
  id: string;
  dimension: QualityDimension;
  weight: RuleWeight;
  /** A failed critical rule caps the record's score at CRITICAL_CAP. */
  isCritical?: boolean;
  /** Omitted = applies to every record. */
  appliesTo?: (record: T, ctx: RuleContext) => boolean;
  /** true = the record passes. */
  check: (record: T, ctx: RuleContext) => boolean;
  /** Form field to fix, for deep links into the edit page. */
  fixField?: string;
};

export type QualityProfile<T> = {
  entity: 'song' | 'lesson' | 'student';
  rules: QualityRule<T>[];
  /** Builds the identity key used for duplicate detection. */
  identityOf?: (record: T) => string | null;
};

export type QualityBand = 'good' | 'fair' | 'poor';

export type RecordQuality = {
  id: string;
  score: number;
  band: QualityBand;
  /** Ids of rules that applied and failed, heaviest first. */
  failedRuleIds: string[];
  hasCriticalFailure: boolean;
};

export type RuleSummary = {
  ruleId: string;
  dimension: QualityDimension;
  weight: RuleWeight;
  isCritical: boolean;
  failing: number;
  applicable: number;
  /** weight × failing — the fix-queue sort key. */
  impact: number;
};

export type CollectionQuality = {
  total: number;
  averageScore: number;
  bands: Record<QualityBand, number>;
  records: RecordQuality[];
  /** Rules with at least one failure, highest impact first. */
  fixQueue: RuleSummary[];
};
