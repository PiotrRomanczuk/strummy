import * as z from 'zod';

/**
 * One practice tempo range, in percent of the recording's speed, for every place that stores or reads one: a saved
 * exercise, the song card's `?tempo=` link and a student's progress mark (#1213). The card plays the recording at
 * 0.4–1× (a link may ask for 40%, the player's ladder starts at 50%), and a part counts as mastered at 100%, so a
 * tempo outside 40–100 is one the card can neither play nor produce.
 */
export const PRACTICE_TEMPO_MIN = 40;
export const PRACTICE_TEMPO_MAX = 100;

export const PracticeTempoPercentSchema = z
  .number()
  .int()
  .min(PRACTICE_TEMPO_MIN)
  .max(PRACTICE_TEMPO_MAX);

/** True for a whole-number tempo the card can play. */
export const isPracticeTempo = (tempo: number): boolean =>
  PracticeTempoPercentSchema.safeParse(tempo).success;
