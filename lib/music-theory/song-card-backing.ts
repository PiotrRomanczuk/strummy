import { CHORD_VOICINGS } from './chord-voicings';
import { NO_CHORD, type SongCard } from './song-card';
import { SLOTS_PER_BAR } from './song-card-clock';

/**
 * The song card's backing track (SNG-17), pure part: which notes a chord strums, how the backing steps through
 * the card sixteenth by sixteenth (wrapping in the part loop), and where a step falls in the recording's seconds —
 * so the card reads the same clock whether the recording or the backing plays.
 */

/** MIDI notes of the open strings, low E first. */
const OPEN_STRINGS = [40, 45, 50, 55, 59, 64];
const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};
const CHORD_NAME = /^([A-G][#b]?)(m(?!aj))?/;

/** The strings of the card's chord shape, low to high; a plain triad near the guitar's range when there is none. */
export function chordNotes(chord: string): number[] {
  if (chord === NO_CHORD) return [];
  const voicing = CHORD_VOICINGS.find((v) => v.name === chord);
  if (voicing) {
    return voicing.frets.flatMap((fret, string) =>
      fret === null ? [] : [OPEN_STRINGS[string] + fret]
    );
  }
  const match = chord.match(CHORD_NAME);
  if (!match) return [];
  const root = 48 + NOTE_INDEX[match[1]];
  return [root, root + (match[2] ? 3 : 4), root + 7, root + 12];
}

export interface BackingStep {
  bar: number;
  slot: number;
}

/** The next sixteenth: across bar lines, back to the loop's first bar after its last, null after the song. */
export function nextStep(
  card: SongCard,
  step: BackingStep,
  loop: { firstBar: number; lastBar: number } | null
): BackingStep | null {
  if (step.slot < SLOTS_PER_BAR - 1) return { bar: step.bar, slot: step.slot + 1 };
  const bar = step.bar + 1;
  if (loop && (bar > loop.lastBar || bar < loop.firstBar)) return { bar: loop.firstBar, slot: 0 };
  return bar < card.bars.length ? { bar, slot: 0 } : null;
}

/** Where a sixteenth of the card lies in the recording, in seconds. */
export function secondsAt(card: SongCard, step: BackingStep): number {
  const bar = card.bars[step.bar];
  if (!bar) return card.duration;
  return bar.start + (step.slot / SLOTS_PER_BAR) * (bar.end - bar.start);
}

/** Backing speeds offered: 40–100% of the recording's tempo in steps of 5. */
export const BACKING_MIN_RATE = 0.4;
/** The backing's tempo when nothing asks for another: slow enough to follow, fast enough to feel the song. */
export const BACKING_DEFAULT_RATE = 0.7;
export const BACKING_RATE_STEP = 0.05;
