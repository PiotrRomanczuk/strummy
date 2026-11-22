/**
 * Notes of a machine transcription placed on the song's real bars (SNG-12). A position is a fractional bar
 * number: bar 1 starts at the first downbeat (1.0), halfway through bar 3 is 3.5. Positions come from seconds
 * through the downbeats, because real bars drift from a steady tempo (in 82 of 156 analysed songs at least one
 * bar is more than 25% off) — never from the transcriber's own bar/slot guess.
 */

import { noteFromIndex } from './notes';
import type { TranscriptionGrid, TranscriptionNote } from '@/schemas/SongTranscriptionSchema';

/** [start position, end position, MIDI pitch] */
export type RollNote = [number, number, number];

export interface RollTrack {
  notes: RollNote[];
  /** Lowest and highest pitch of the whole track, so the vertical scale holds across pages. */
  low: number | null;
  high: number | null;
}

const DEFAULT_BAR_SECONDS = 2;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** Seconds of one bar at the nominal tempo, for time before the first and after the last downbeat. */
export function nominalBarSeconds(grid: TranscriptionGrid): number {
  const { downbeats_s: downbeats, bpm, beats_per_bar: beats } = grid;
  if (downbeats.length >= 2) return (downbeats.at(-1)! - downbeats[0]) / (downbeats.length - 1);
  return bpm && beats ? (beats * 60) / bpm : DEFAULT_BAR_SECONDS;
}

/** The index of the last downbeat at or before `seconds` (-1 before the first). */
function barIndex(seconds: number, downbeats: number[]): number {
  let low = 0;
  let high = downbeats.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (downbeats[middle] <= seconds) {
      found = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return found;
}

/**
 * Fractional bar position of a moment of the recording. Moments before the
 * first downbeat (pickups, vocal intros) get a position below 1; the roll
 * starts at bar 1, so notes that end before it are deliberately not drawn.
 */
export function barPosition(seconds: number, downbeats: number[], barSeconds: number): number {
  const index = barIndex(seconds, downbeats);
  if (index < 0) return 1 + (seconds - downbeats[0]) / barSeconds;
  const next = downbeats[index + 1];
  const length = next === undefined ? barSeconds : next - downbeats[index];
  return 1 + index + (seconds - downbeats[index]) / length;
}

/** A track's notes as positions on the grid, with its pitch range. */
export function toRollTrack(notes: TranscriptionNote[], grid: TranscriptionGrid): RollTrack {
  const barSeconds = nominalBarSeconds(grid);
  const placed = notes.map(([start, seconds, pitch]): RollNote => [
    round3(barPosition(start, grid.downbeats_s, barSeconds)),
    round3(barPosition(start + seconds, grid.downbeats_s, barSeconds)),
    pitch,
  ]);
  const pitches = notes.map((note) => note[2]);
  return {
    notes: placed,
    low: pitches.length ? Math.min(...pitches) : null,
    high: pitches.length ? Math.max(...pitches) : null,
  };
}

/** Notes sounding anywhere in bars [first, first + count), not only those starting there. */
export function notesInBars(notes: RollNote[], first: number, count: number): RollNote[] {
  const last = first + count;
  return notes.filter(([start, end]) => end > first && start < last);
}

/** Scientific pitch name of a MIDI note: 60 → C4, 45 → A2. */
export function midiName(pitch: number): string {
  return `${noteFromIndex(pitch)}${Math.floor(pitch / 12) - 1}`;
}
