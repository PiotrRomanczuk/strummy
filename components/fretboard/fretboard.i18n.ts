import { CHORD_DEFINITIONS, SCALE_DEFINITIONS } from '@/lib/music-theory';

/**
 * Translation seam for the fretboard.
 *
 * `lib/music-theory` stays a pure data layer — it knows intervals, not
 * languages — so the English names it carries are the fallback, and the
 * display names live in `messages/*.json` under `Fretboard.scales` /
 * `Fretboard.chords`. `fretboard.i18n.test.ts` asserts every definition has a
 * translation in every locale, so a scale added to the data without a name
 * fails a test rather than a page.
 */

/**
 * The shape we need from `useTranslations('Fretboard')`. Deliberately loose:
 * this module is called from a dozen components and should not care how
 * next-intl types its message keys.
 */
export type Translate = ((key: string, values?: Record<string, string | number>) => string) & {
  has?: (key: string) => boolean;
};

function translateOr(t: Translate, key: string, fallback: string): string {
  if (t.has?.(key) === false) return fallback;
  return t(key);
}

/** Display name of a scale — "Pentatonic Minor", "Pentatonika molowa". */
export function scaleName(t: Translate, scaleKey: string): string {
  return translateOr(t, `scales.${scaleKey}.name`, SCALE_DEFINITIONS[scaleKey]?.name ?? scaleKey);
}

/** One-line description of a scale, for the info rail. */
export function scaleDescription(t: Translate, scaleKey: string): string {
  return translateOr(
    t,
    `scales.${scaleKey}.description`,
    SCALE_DEFINITIONS[scaleKey]?.description ?? ''
  );
}

/** Display name of a chord quality — "Minor 7th", "Septymowy molowy". */
export function chordName(t: Translate, chordKey: string): string {
  return translateOr(t, `chords.${chordKey}.name`, CHORD_DEFINITIONS[chordKey]?.name ?? chordKey);
}

/** One-line description of a chord quality, for the info rail. */
export function chordDescription(t: Translate, chordKey: string): string {
  return translateOr(
    t,
    `chords.${chordKey}.description`,
    CHORD_DEFINITIONS[chordKey]?.description ?? ''
  );
}
