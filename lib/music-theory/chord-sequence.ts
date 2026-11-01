/**
 * Read the playing order of chords from `songs.lyrics_with_chords`. The
 * `songs.chords` column is a list of distinct chords, so it says nothing about
 * order. Sheets come in two shapes: inline `[G]` markers, or chords on their
 * own line above the lyrics.
 */

import { parseChord, type ParsedChord } from './chord-parser';

const CHORD_TOKEN =
  /^[A-G][#b]?(?:maj|min|m|M|dim|aug|sus|add|\+|°|-)?[0-9]*(?:(?:sus|add|maj|b|#)[0-9]+)*(?:\/[A-G][#b]?)?$/;
const INLINE_CHORD = /\[([A-G][^\]\s]{0,12})\]/g;
const MIN_INLINE_CHORDS = 4;
const LINE_NOISE = /^(?:\|+|x\d+|\d+x|\(x?\d+x?\)|-+|\/+|N\.?C\.?)$/i;

const dropRepeats = (chords: ParsedChord[]) =>
  chords.filter((chord, index) => chord.raw !== chords[index - 1]?.raw);

const parseAll = (tokens: string[]) =>
  tokens.map(parseChord).filter((c): c is ParsedChord => c !== null);

function chordsFromLine(line: string): string[] {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  const chords = tokens.filter((token) => !LINE_NOISE.test(token));
  if (chords.length === 0 || !chords.every((token) => CHORD_TOKEN.test(token))) return [];
  return chords;
}

export function extractChordSequence(sheet: string | null | undefined): ParsedChord[] {
  if (!sheet) return [];

  const inline = [...sheet.matchAll(INLINE_CHORD)]
    .map((match) => match[1])
    .filter((token) => CHORD_TOKEN.test(token));
  if (inline.length >= MIN_INLINE_CHORDS) return dropRepeats(parseAll(inline));

  return dropRepeats(parseAll(sheet.split(/\r?\n/).flatMap(chordsFromLine)));
}
