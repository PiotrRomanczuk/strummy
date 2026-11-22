/**
 * A song's chords as guitar shapes a student either knows or not: "Em7", "e",
 * "Em/B" and "Em" are all the Em shape. Read from `songs.chords`, which teachers
 * fill by hand in several dialects: "Am, G", "Bm F# A", "{G,e,b,C}", Polish
 * names ("fis", "h", "H"), section labels and repeat marks ("Refren: a d x2").
 *
 * Chords are taken as written: a sheet with a capo already names the shapes.
 * Extensions, sus/add and slash basses fold into the triad, because a student
 * who plays Em plays Em7 with one finger lifted; a diminished shape stays apart.
 */

import { parseChord } from './chord-parser';
import { NOTE_TO_SEMITONE } from './chromatic';

/** A shape's display name, which is also its identity: "C", "F#m", "Bb", "C#dim". */
export type ChordShape = string;

/** Above this many different shapes the field is a song sheet, not a chord list. */
export const MAX_SHAPES_PER_SONG = 10;

const MAJOR_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

// Polish/German names: H is B, "is" sharpens, "es"/"s" flattens ("fis", "Cis", "es", "as").
const POLISH_ROOT = /^([A-Ha-h])(is|es|s)?(?![a-z])/;
const SECTION_LABEL = /:$/;
const NOISE = /^(?:\|+|\/+|-+|x\d+|\d+x|N\.?C\.?)$/i;
const PARENTHESISED = /\([^)]*\)/g;

const pitchName = (letter: string, accidental: string | undefined): string => {
  const base = letter.toUpperCase() === 'H' ? 'B' : letter.toUpperCase();
  if (accidental === 'is') return `${base}#`;
  if (accidental === 'es' || accidental === 's') return `${base}b`;
  return base;
};

/** "fis" → "F#m", "h7" → "Bm7", "Cis" → "C#", "H" → "B"; anything else unchanged. */
export function englishChordName(token: string): string {
  const match = token.match(POLISH_ROOT);
  if (!match) return token;
  const [whole, letter, accidental] = match;
  const isMinorByCase = letter === letter.toLowerCase();
  const isPolish = Boolean(accidental) || letter.toUpperCase() === 'H' || isMinorByCase;
  if (!isPolish) return token;
  const rest = token.slice(whole.length);
  return `${pitchName(letter, accidental)}${isMinorByCase ? 'm' : ''}${rest}`;
}

/** The shape of one chord token, or null when the token is not a chord. */
export function chordShape(token: string): ChordShape | null {
  const chord = parseChord(englishChordName(token));
  if (!chord) return null;
  const pitch = NOTE_TO_SEMITONE[chord.root];
  if (pitch === undefined) return null;
  if (chord.quality === 'minor') return `${MINOR_NAMES[pitch]}m`;
  if (chord.quality === 'diminished') return `${MINOR_NAMES[pitch]}dim`;
  return MAJOR_NAMES[pitch];
}

const tokens = (field: string): string[] =>
  field
    .replace(PARENTHESISED, ' ')
    .replace(/[{}"']/g, ' ')
    .split(/[\s,;]+/)
    .filter((token) => token && !SECTION_LABEL.test(token) && !NOISE.test(token));

/**
 * The distinct shapes of a `songs.chords` field, in first-seen order. Null when
 * the field holds anything that is not a chord (a pasted tab, "Various") or
 * too many shapes to be a chord list: better leave a song out than count noise.
 */
export function chordShapes(field: string | null | undefined): ChordShape[] | null {
  if (!field?.trim()) return null;
  const shapes: ChordShape[] = [];
  for (const token of tokens(field)) {
    const shape = chordShape(token);
    if (!shape) return null;
    if (!shapes.includes(shape)) shapes.push(shape);
  }
  if (shapes.length === 0 || shapes.length > MAX_SHAPES_PER_SONG) return null;
  return shapes;
}
