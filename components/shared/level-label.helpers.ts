/**
 * Skill-level labels, shared by songs and theory.
 *
 * Both domains store `level` as free text and both render it through the same
 * three message keys, so this existed five times — twice as a full `levelLabel`
 * implementation (songs + theory) and three more times as an inline
 * `LEVEL_LABEL_KEYS` map inside a component. The copies had already drifted:
 * one capitalised an unrecognised value, another returned it raw.
 *
 * The `t` translator is injected rather than resolved here, so the same code
 * serves the `Songs` and `Theory` namespaces — both define `levelBeginner`,
 * `levelIntermediate` and `levelAdvanced`.
 */
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export type Level = (typeof LEVELS)[number];

export type LevelLabelKey = 'levelBeginner' | 'levelIntermediate' | 'levelAdvanced';

export const LEVEL_LABEL_KEYS: Record<Level, LevelLabelKey> = {
  beginner: 'levelBeginner',
  intermediate: 'levelIntermediate',
  advanced: 'levelAdvanced',
};

const isLevel = (value: string): value is Level => value in LEVEL_LABEL_KEYS;

/**
 * `level` is a free-text column, so a row can hold a value with no message key.
 * An unrecognised value renders capitalised rather than as a missing-translation
 * error — a stray "expert" should read as "Expert", not crash the page.
 */
export const levelLabel = (
  level: string | null | undefined,
  t: (key: string) => string
): string => {
  if (!level) return '';
  if (isLevel(level)) return t(LEVEL_LABEL_KEYS[level]);
  return level.charAt(0).toUpperCase() + level.slice(1);
};
