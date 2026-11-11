/**
 * Convert chords to Roman numeral notation relative to a key.
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

/**
 * Determine the expected chord quality for each scale degree.
 * Major key: I ii iii IV V vi vii°
 * Minor key: i ii° III iv v VI VII
 */
function expectedQualities(isMinorKey: boolean): Array<'major' | 'minor' | 'diminished'> {
  if (isMinorKey) {
    return ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];
  }
  return ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
}

/**
 * Convert a parsed chord to its Roman numeral in the given key.
 */
export function chordToRomanNumeral(chord: ParsedChord, songKey: string): RomanNumeralResult {
  const isMinorKey = songKey.endsWith('m');
  const keyRoot = isMinorKey ? songKey.slice(0, -1) : songKey;

  if (NOTE_TO_SEMITONE[keyRoot] === undefined) {
    return { numeral: chord.raw, degree: -1, isDiatonic: false };
  }

  const intervals = isMinorKey ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS;
  const dist = semitoneDistance(keyRoot, chord.root);
  const qualities = expectedQualities(isMinorKey);

  // Find matching scale degree
  const degreeIdx = (intervals as readonly number[]).indexOf(dist);

  if (degreeIdx !== -1) {
    const isLower = chord.quality === 'minor' || chord.quality === 'diminished';
    let numeral = isLower ? ROMAN[degreeIdx].toLowerCase() : ROMAN[degreeIdx];
    if (chord.quality === 'diminished') numeral += '\u00B0';
    if (chord.extension) numeral += chord.extension;

    const isDiatonic = chord.quality === qualities[degreeIdx]
      || chord.quality === 'power'
      || chord.quality === 'suspended';

    return { numeral, degree: degreeIdx + 1, isDiatonic };
  }

  // Chromatic chord — find closest scale degree and add accidental
  const closestDegree = findClosestDegree(dist, intervals, !isMinorKey);
  const isLower = chord.quality === 'minor' || chord.quality === 'diminished';
  const accidental = dist < intervals[closestDegree] ? 'b' : '#';
  let numeral = isLower
    ? ROMAN[closestDegree].toLowerCase()
    : ROMAN[closestDegree];
  numeral = accidental + numeral;
  if (chord.quality === 'diminished') numeral += '\u00B0';
  if (chord.extension) numeral += chord.extension;

  return { numeral, degree: closestDegree + 1, isDiatonic: false };
}

/** Between two neighbours a major key reads flat: bVII, not #VI. */
function findClosestDegree(
  semitones: number,
  intervals: readonly number[],
  preferUpper: boolean
): number {
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

/**
 * Convert a sequence of parsed chords to Roman numerals.
 */
export function chordsToRomanNumerals(
  chords: ParsedChord[],
  songKey: string
): RomanNumeralResult[] {
  return chords.map((c) => chordToRomanNumeral(c, songKey));
}
