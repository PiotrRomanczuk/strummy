import { type NoteName, CHROMATIC_NOTES, getNoteIndex } from './notes';

export interface ScaleDefinition {
  name: string;
  intervals: number[];
  description: string;
}

export const SCALE_DEFINITIONS: Record<string, ScaleDefinition> = {
  major: {
    name: 'Major (Ionian)',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: 'The most common scale. Bright, happy sound.',
  },
  natural_minor: {
    name: 'Natural Minor (Aeolian)',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: 'Sad, melancholic character. Relative minor of major.',
  },
  pentatonic_major: {
    name: 'Pentatonic Major',
    intervals: [0, 2, 4, 7, 9],
    description: 'Five-note scale. Very common in rock and country.',
  },
  pentatonic_minor: {
    name: 'Pentatonic Minor',
    intervals: [0, 3, 5, 7, 10],
    description: 'The go-to scale for blues and rock soloing.',
  },
  blues: {
    name: 'Blues',
    intervals: [0, 3, 5, 6, 7, 10],
    description: 'Minor pentatonic with added blue note (b5).',
  },
  dorian: {
    name: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: 'Minor scale with raised 6th. Jazz and funk.',
  },
  mixolydian: {
    name: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    description: 'Major scale with flat 7th. Blues rock, classic rock.',
  },
  phrygian: {
    name: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    description: 'Spanish/flamenco flavor. Dark, exotic sound.',
  },
  lydian: {
    name: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    description: 'Major scale with raised 4th. Dreamy, ethereal.',
  },
  harmonic_minor: {
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    description: 'Natural minor with raised 7th. Classical, neoclassical metal.',
  },
  melodic_minor: {
    name: 'Melodic Minor',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    description: 'Natural minor with raised 6th and 7th. Jazz.',
  },
  chromatic: {
    name: 'Chromatic',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description: 'All 12 notes. Used for exercises and passing tones.',
  },
};

/**
 * Get the notes of a scale given a root note and scale type.
 */
export function getScaleNotes(root: NoteName, scaleKey: string): NoteName[] {
  const scale = SCALE_DEFINITIONS[scaleKey];
  if (!scale) return [];
  const rootIndex = getNoteIndex(root);
  return scale.intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12;
    return CHROMATIC_NOTES[noteIndex];
  });
}

/**
 * Check if a note belongs to a specific scale.
 */
export function isNoteInScale(note: NoteName, root: NoteName, scaleKey: string): boolean {
  const scaleNotes = getScaleNotes(root, scaleKey);
  return scaleNotes.includes(note);
}

/**
 * Get the degree of a note in a scale (1-based), or 0 if not in scale.
 */
export function getNoteDegree(note: NoteName, root: NoteName, scaleKey: string): number {
  const scaleNotes = getScaleNotes(root, scaleKey);
  const index = scaleNotes.indexOf(note);
  return index === -1 ? 0 : index + 1;
}

/**
 * The whole/half-step pattern between consecutive scale degrees (wrapping
 * back to the octave), e.g. Major → "W-W-H-W-W-W-H". Derived from
 * `intervals`, so it stays correct without hand-authoring per scale.
 */
export function getScaleStepFormula(scaleKey: string): string {
  const scale = SCALE_DEFINITIONS[scaleKey];
  if (!scale) return '';
  return scale.intervals
    .map((interval, i) => {
      const next = scale.intervals[i + 1] ?? scale.intervals[0] + 12;
      const diff = next - interval;
      if (diff === 1) return 'H';
      if (diff === 2) return 'W';
      if (diff === 3) return 'WH';
      return `${diff}sem`;
    })
    .join('-');
}
