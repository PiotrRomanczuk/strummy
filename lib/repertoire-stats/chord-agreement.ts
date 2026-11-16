/**
 * Entered chords against the chords heard in the recording (SNG-13). Entered chords are guitar shapes, so they are
 * compared as sounding triads: moved up by the capo and, when the guitar was tuned down or the song was entered in
 * another key, by the shift that makes them agree.
 */

import { parseChordsColumn, type ParsedChord } from '@/lib/music-theory/chord-parser';
import { NOTE_TO_SEMITONE } from '@/lib/music-theory/chromatic';

/** Below this share of entered chords heard in the recording, the chords disagree. */
export const MIN_CHORD_SHARE = 0.6;

/** A sounding triad as "<pitch class>" or "<pitch class>m", e.g. "4m" for E minor. */
export const triad = (chord: ParsedChord, shift: number) =>
  `${((NOTE_TO_SEMITONE[chord.root] ?? 0) + shift + 120) % 12}${chord.quality === 'minor' ? 'm' : ''}`;

/**
 * A chord symbol and nothing else: root, quality, extensions, alterations, slash bass. The chords column also
 * holds tab lines, notes and words ("Bend", "Capo:"), which the lenient parser would read as chords.
 */
const CHORD_SYMBOL =
  /^[A-G][#b]?(maj|min|m|M|dim|aug|sus|add|°|ø|\+)?\d*((maj|sus|add|b|#)?\d+|\(\w+\))*(\/[A-G][#b]?)?$/;

export const isChordSymbol = (chord: ParsedChord) =>
  chord.root in NOTE_TO_SEMITONE && CHORD_SYMBOL.test(chord.raw.trim());

export const knownChords = (chords: string[] | string | null): ParsedChord[] =>
  parseChordsColumn(Array.isArray(chords) ? chords.join(', ') : chords).filter(isChordSymbol);

/** The chord symbols of a column, each once, in the order they first appear. */
export const chordNames = (chords: string[] | string | null): string[] => [
  ...new Set(knownChords(chords).map((chord) => chord.raw.trim())),
];

/** Share of the entered chords (as sounding triads after `shift`) that the recording's chords contain. */
function shareAt(shapes: ParsedChord[], heard: Set<string>, shift: number): number {
  const sounding = new Set(shapes.map((chord) => triad(chord, shift)));
  const found = [...sounding].filter((chord) => heard.has(chord)).length;
  return Math.round((found / sounding.size) * 100) / 100;
}

/** Share of the entered chords heard in the recording under the capo; null without chords on both sides. */
export function chordShare(
  entered: string | null,
  capo: number,
  measured: string[]
): number | null {
  const shapes = knownChords(entered);
  const heard = knownChords(measured);
  if (shapes.length === 0 || heard.length === 0) return null;
  return shareAt(shapes, new Set(heard.map((chord) => triad(chord, 0))), capo);
}

/** Semitones as -6…+5, the nearer way round. */
const signed = (shift: number) => (shift > 6 ? shift - 12 : shift);

/**
 * The extra shift (on top of the capo) under which disagreeing chords agree, e.g. -1 for a guitar tuned half a step
 * down; null when the chords already agree or no shift makes them.
 */
export function chordShift(
  entered: string | null,
  capo: number,
  measured: string[]
): { shift: number; share: number } | null {
  const shapes = knownChords(entered);
  const heard = new Set(knownChords(measured).map((chord) => triad(chord, 0)));
  if (shapes.length === 0 || heard.size === 0) return null;
  if (shareAt(shapes, heard, capo) >= MIN_CHORD_SHARE) return null;
  let best = { shift: 0, share: 0 };
  for (let shift = 1; shift < 12; shift += 1) {
    const share = shareAt(shapes, heard, capo + shift);
    if (share > best.share) best = { shift: signed(shift), share };
  }
  return best.share >= MIN_CHORD_SHARE ? best : null;
}
