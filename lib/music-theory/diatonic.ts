import { getScaleNotes } from './scales';
import { type NoteName } from './notes';

/** Chord quality suffix for a scale degree. */
export type DiatonicQuality = '' | 'm' | '°' | '+';

export interface DiatonicChord {
  root: NoteName;
  quality: DiatonicQuality;
  /** Roman numeral, cased and decorated to match the quality (I, ii, vii°, III+). */
  roman: string;
}

/**
 * Triad qualities for each degree of the scales that have a settled diatonic
 * harmony. Scales missing here (pentatonics, blues, chromatic) have no
 * seven-degree harmonisation, so they return no chords.
 */
export const DIATONIC_QUALITIES: Record<string, DiatonicQuality[]> = {
  major: ['', 'm', 'm', '', '', 'm', '°'],
  natural_minor: ['m', '°', '', 'm', 'm', '', ''],
  dorian: ['m', 'm', '', '', 'm', '°', ''],
  mixolydian: ['', 'm', '°', '', 'm', 'm', ''],
  phrygian: ['m', '', '', 'm', '°', '', 'm'],
  lydian: ['', '', 'm', '°', '', 'm', 'm'],
  harmonic_minor: ['m', '°', '+', 'm', '', '', '°'],
  melodic_minor: ['m', 'm', '+', '', '', '°', '°'],
};

const ROMAN_DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

/** Roman numeral for a degree, cased by quality: minor/diminished lowercase. */
export function romanNumeralFor(degreeIndex: number, quality: DiatonicQuality): string {
  const base = ROMAN_DEGREES[degreeIndex] ?? '';
  const isMinorish = quality === 'm' || quality === '°';
  const numeral = isMinorish ? base.toLowerCase() : base;
  if (quality === '°') return `${numeral}°`;
  if (quality === '+') return `${numeral}+`;
  return numeral;
}

/** The triads built on each degree of `scaleKey` in `root`. */
export function getDiatonicChords(root: NoteName, scaleKey: string): DiatonicChord[] {
  const qualities = DIATONIC_QUALITIES[scaleKey];
  if (!qualities) return [];
  const notes = getScaleNotes(root, scaleKey);
  return qualities.map((quality, i) => ({
    root: notes[i],
    quality,
    roman: romanNumeralFor(i, quality),
  }));
}
