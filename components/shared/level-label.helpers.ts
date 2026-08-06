/**
 * Skill-level labels, shared by songs and theory.
 *
 * Both domains store `level` as free text and both render it through the same
 * message keys, so this existed five times — twice as a full `levelLabel`
 * implementation (songs + theory) and three more times as an inline
 * `LEVEL_LABEL_KEYS` map inside a component. The copies had already drifted:
 * one capitalised an unrecognised value, another returned it raw.
 *
 * The `t` translator is injected rather than resolved here, so the same code
 * serves the `Songs` and `Theory` namespaces — both define every `level*` key.
 *
 * The two domains no longer offer the *same* set. Songs gained `starter` on
 * 2026-08-06 (a fourth level below `beginner`, for first-weeks material);
 * theory courses stayed at three. They are separate Postgres enums —
 * `difficulty_level` and `theoretical_course_level` — so the pickers must not
 * share one constant, or the theory form would offer a value its column
 * rejects. `LEVEL_LABEL_KEYS` stays shared: it is a lookup, not a menu, and a
 * superset costs nothing.
 */
export const SONG_LEVELS = ['starter', 'beginner', 'intermediate', 'advanced'] as const;
export const THEORY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export type SongLevel = (typeof SONG_LEVELS)[number];
export type TheoryLevel = (typeof THEORY_LEVELS)[number];
export type Level = SongLevel;

export type LevelLabelKey =
  'levelStarter' | 'levelBeginner' | 'levelIntermediate' | 'levelAdvanced';

export const LEVEL_LABEL_KEYS: Record<SongLevel, LevelLabelKey> = {
  starter: 'levelStarter',
  beginner: 'levelBeginner',
  intermediate: 'levelIntermediate',
  advanced: 'levelAdvanced',
};

const isLevel = (value: string): value is SongLevel => value in LEVEL_LABEL_KEYS;

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
