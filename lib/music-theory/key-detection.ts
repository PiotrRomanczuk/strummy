/**
 * Infer a song's key from its chord shapes. The stored `songs.key` cannot do
 * this job: it may be the sounding key of a capo song, or a form default.
 */

import { NOTE_TO_SEMITONE, semitoneDistance } from './chromatic';
import type { ParsedChord } from './chord-parser';
import { chordToRomanNumeral } from './roman-numeral';

const KEY_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'] as const;

/** Below this lead over the runner-up, the result is shown as a guess. */
const CONFIDENT_LEAD = 1;

export interface KeyDetection {
  key: string;
  isConfident: boolean;
}

function scoreKey(key: string, chords: ParsedChord[]): number {
  const isMinor = key.endsWith('m');
  const root = isMinor ? key.slice(0, -1) : key;
  const tonicQuality = isMinor ? 'minor' : 'major';
  const isTonic = (c: ParsedChord) =>
    NOTE_TO_SEMITONE[c.root] === NOTE_TO_SEMITONE[root] &&
    (c.quality === tonicQuality || c.quality === 'power' || c.quality === 'suspended');

  const counts = new Map<string, { chord: ParsedChord; count: number }>();
  for (const chord of chords) {
    const entry = counts.get(chord.raw);
    if (entry) entry.count += 1;
    else counts.set(chord.raw, { chord, count: 1 });
  }

  let score = 0;
  let tonicCount = 0;
  for (const { chord, count } of counts.values()) {
    // A chord played often says more than one passing through, but not linearly.
    const weight = 1 + Math.log2(count);
    const isMinorDominant =
      isMinor && chord.quality === 'major' && semitoneDistance(root, chord.root) === 7;
    if (isMinorDominant || chordToRomanNumeral(chord, key).isDiatonic) score += weight;
    else score -= weight;
    if (isTonic(chord)) tonicCount += count;
  }

  if (tonicCount > 0) score += 1 + (2 * tonicCount) / chords.length;
  if (isTonic(chords[0])) score += 2;
  if (isTonic(chords[chords.length - 1])) score += 1;
  return score;
}

/** `chords` in playing order when known, otherwise the song's chord list. */
export function detectKey(chords: ParsedChord[]): KeyDetection | null {
  if (chords.length === 0) return null;

  const candidates = KEY_ROOTS.flatMap((root) => [root, `${root}m`]);
  const ranked = candidates
    .map((key) => ({ key, score: scoreKey(key, chords) }))
    .sort((a, b) => b.score - a.score);

  return { key: ranked[0].key, isConfident: ranked[0].score - ranked[1].score >= CONFIDENT_LEAD };
}
