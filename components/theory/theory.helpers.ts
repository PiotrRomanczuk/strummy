/**
 * `courses.level` is a free-text column, so a row can hold a value the UI has
 * no label for. Map the three known levels onto Theory message keys and let
 * anything else fall through to the raw value rather than rendering a missing
 * -translation error.
 */
const LEVEL_LABEL_KEYS: Record<string, string> = {
  beginner: 'levelBeginner',
  intermediate: 'levelIntermediate',
  advanced: 'levelAdvanced',
};

export const levelLabel = (level: string, t: (key: string) => string): string => {
  const key = LEVEL_LABEL_KEYS[level];
  return key ? t(key) : level;
};
