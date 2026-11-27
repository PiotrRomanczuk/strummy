/**
 * Roman numerals — the app's one convention (#1242): a degree is counted from the song's own tonic in its own
 * mode. A minor key reads natural minor (i ii° III iv v VI VII), so C in A minor is III, not bIII; only a chord
 * outside the scale gets a flat or a sharp. Every numeral the app shows comes from `degreeNumeral`, through
 * `chordToRomanNumeral` (Strummy's chords) or `tonicNumeral` (song2logic's numerals, which it writes against
 * the parallel major).
 */

import {
  NOTE_TO_SEMITONE,
  MAJOR_SCALE_INTERVALS,
  MINOR_SCALE_INTERVALS,
  semitoneDistance,
} from './chromatic';
import type { ParsedChord } from './chord-parser';

export interface RomanNumeralResult {
  numeral: string;
  degree: number;
  isDiatonic: boolean;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

/** Expected chord quality per degree — major key: I ii iii IV V vi vii° · minor key: i ii° III iv v VI VII. */
function expectedQualities(isMinorKey: boolean): Array<'major' | 'minor' | 'diminished'> {
  if (isMinorKey) {
    return ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];
  }
  return ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
}

/** Between two neighbours, `preferUpper` reads flat (bVII, not #VI); otherwise the lower one, sharpened. */
function findClosestDegree(semitones: number, intervals: readonly number[], preferUpper: boolean) {
  let best = 0;
  let bestDiff = 12;
  for (let i = 0; i < intervals.length; i++) {
    const diff = Math.abs(semitones - intervals[i]);
    if (diff < bestDiff || (preferUpper && diff === bestDiff)) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

export interface DegreeNumeral {
  /** 0-based scale degree. */
  index: number;
  /** The numeral, cased by `isLower` and with its accidental; no quality marks. */
  numeral: string;
  isInScale: boolean;
}

/** The numeral of a root `semitones` above the tonic, in the key's own scale. */
export function degreeNumeral(
  semitones: number,
  isMinorKey: boolean,
  isLower: boolean
): DegreeNumeral {
  const intervals: readonly number[] = isMinorKey ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS;
  const step = ((semitones % 12) + 12) % 12;
  const exact = intervals.indexOf(step);
  // A minor key sharpens between neighbours (#VI, #VII), except next to the tonic: the Neapolitan is bII, never #I.
  const preferUpper = !isMinorKey || step === 1;
  const index = exact !== -1 ? exact : findClosestDegree(step, intervals, preferUpper);
  const accidental = exact !== -1 ? '' : step < intervals[index] ? 'b' : '#';
  const roman = isLower ? ROMAN[index].toLowerCase() : ROMAN[index];
  return { index, numeral: accidental + roman, isInScale: exact !== -1 };
}

/** Convert a parsed chord to its Roman numeral in the given key ("Bm" = B minor). */
export function chordToRomanNumeral(chord: ParsedChord, songKey: string): RomanNumeralResult {
  const isMinorKey = songKey.endsWith('m');
  const keyRoot = isMinorKey ? songKey.slice(0, -1) : songKey;

  if (NOTE_TO_SEMITONE[keyRoot] === undefined) {
    return { numeral: chord.raw, degree: -1, isDiatonic: false };
  }

  const isLower = chord.quality === 'minor' || chord.quality === 'diminished';
  const degree = degreeNumeral(semitoneDistance(keyRoot, chord.root), isMinorKey, isLower);
  let numeral = degree.numeral;
  if (chord.quality === 'diminished') numeral += '°';
  if (chord.extension) numeral += chord.extension;

  const isDiatonic =
    degree.isInScale &&
    (chord.quality === expectedQualities(isMinorKey)[degree.index] ||
      chord.quality === 'power' ||
      chord.quality === 'suspended');

  return { numeral, degree: degree.index + 1, isDiatonic };
}

/** Convert a sequence of parsed chords to Roman numerals. */
export function chordsToRomanNumerals(
  chords: ParsedChord[],
  songKey: string
): RomanNumeralResult[] {
  return chords.map((c) => chordToRomanNumeral(c, songKey));
}

const MAJOR_NUMERAL = /^([b#]?)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(.*)$/;

function oneTonicNumeral(token: string, isMinorKey: boolean): string {
  const match = MAJOR_NUMERAL.exec(token);
  if (!match) return token;
  const [, accidental, roman, rest] = match;
  const index = ROMAN.indexOf(roman.toUpperCase() as (typeof ROMAN)[number]);
  const shift = accidental === 'b' ? -1 : accidental === '#' ? 1 : 0;
  const isLower = roman !== roman.toUpperCase();
  return degreeNumeral(MAJOR_SCALE_INTERVALS[index] + shift, isMinorKey, isLower).numeral + rest;
}

/**
 * A numeral counted against the major scale (song2logic writes bIII, bVI, bVII in minor) in the app's
 * convention. Half bars ("bVII IV") convert per chord; anything that is not a numeral ("N", "?") stays.
 */
export function tonicNumeral(numeral: string, isMinorKey: boolean): string {
  return numeral
    .split(' ')
    .map((token) => oneTonicNumeral(token, isMinorKey))
    .join(' ');
}
