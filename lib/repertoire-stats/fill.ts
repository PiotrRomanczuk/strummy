/**
 * Values a song is missing in Strummy that its recording knows (SNG-14): the tempo, the key and the chords,
 * proposed only where the Strummy field is empty and the measurement can be trusted. Under a capo the recording's
 * key and chords sound higher than the shapes Strummy stores, so a song with a capo gets no key or chords.
 */

import { MusicKeyEnum, type MusicKey } from '@/schemas/CommonSchema';

import { chordNames } from './chord-agreement';
import { MIN_KEY_STRENGTH } from './mismatches';

export type FillField = 'tempo' | 'key' | 'chords';
export const FILL_FIELDS: readonly FillField[] = ['tempo', 'key', 'chords'];

export type FillSuggestion =
  | { field: 'tempo'; value: number }
  | { field: 'key'; value: MusicKey }
  | { field: 'chords'; value: string };

export interface FillSong {
  tempo: number | null;
  key: string | null;
  chords: string | null;
  lyrics_with_chords: string | null;
  capo_fret: number | null;
}

export interface FillMeasure {
  bpm: number | null;
  key: string | null;
  keyStrength: number | null;
  chords: string[];
}

/** The tempo range the song form accepts and the quality rule checks. */
const TEMPO_RANGE = [20, 300] as const;
/** The chords column holds a short list; the song form caps it at 500 characters. */
const CHORDS_MAX = 500;
const SHARP_OF: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

const hasText = (value: string | null) => !!value && value.trim().length > 0;

/** A measured key ("Ebm", "Bb") in Strummy's spelling ("D#m", "A#"); null when Strummy has no such key. */
export function toStrummyKey(key: string): MusicKey | null {
  const isMinor = key.endsWith('m');
  const root = isMinor ? key.slice(0, -1) : key;
  const parsed = MusicKeyEnum.safeParse(`${SHARP_OF[root] ?? root}${isMinor ? 'm' : ''}`);
  return parsed.success ? parsed.data : null;
}

const hasTempo = (tempo: number | null) =>
  tempo !== null && tempo >= TEMPO_RANGE[0] && tempo <= TEMPO_RANGE[1];

/** "C" on a song without chords is the song form's old default, not a key (data-quality rule song.key). */
const hasKey = (song: FillSong) =>
  hasText(song.key) &&
  !(song.key === 'C' && !hasText(song.chords) && !hasText(song.lyrics_with_chords));

function tempoOf(song: FillSong, measured: FillMeasure): FillSuggestion | null {
  if (hasTempo(song.tempo) || measured.bpm === null) return null;
  const bpm = Math.round(measured.bpm);
  return hasTempo(bpm) ? { field: 'tempo', value: bpm } : null;
}

function keyOf(song: FillSong, measured: FillMeasure): FillSuggestion | null {
  if (hasKey(song) || (song.capo_fret ?? 0) > 0 || !measured.key) return null;
  if ((measured.keyStrength ?? 1) < MIN_KEY_STRENGTH) return null;
  const key = toStrummyKey(measured.key);
  return key ? { field: 'key', value: key } : null;
}

function chordsOf(song: FillSong, measured: FillMeasure): FillSuggestion | null {
  if (hasText(song.chords) || hasText(song.lyrics_with_chords) || (song.capo_fret ?? 0) > 0) {
    return null;
  }
  const value = chordNames(measured.chords).join(', ');
  return value && value.length <= CHORDS_MAX ? { field: 'chords', value } : null;
}

/** What the recording can fill in, field by field; empty without a measurement. */
export function fillSuggestionsOf(song: FillSong, measured: FillMeasure | null): FillSuggestion[] {
  if (!measured) return [];
  return [tempoOf(song, measured), keyOf(song, measured), chordsOf(song, measured)].filter(
    (suggestion): suggestion is FillSuggestion => suggestion !== null
  );
}
