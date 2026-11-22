/**
 * Pure rules of the song-transcription backfill: a song2logic `strummy-notes` run directory → rows of
 * `song_transcriptions` (SNG-12). No I/O here — see 2026-11-song-transcriptions.ts.
 */

import type { Json } from '@/types/database.types';
import {
  TranscriptionFileSchema,
  type TrackStats,
  type TranscriptionNote,
} from '@/schemas/SongTranscriptionSchema';

/** One line of the run's results.jsonl; only `ok` lines have a transcription file. */
export interface TranscriptionResultLine {
  id: string;
  status: string;
  recording_url?: string | null;
  notes?: number;
}

export interface SongRow {
  id: string;
  youtube_url: string | null;
  deleted_at: string | null;
}

export interface TranscriptionRow {
  song_id: string;
  recording_url: string;
  tool_version: string;
  transcribed_on: string | null;
  note_count: number;
  grid: Json;
  tracks: Json;
  stats: Json;
}

export type TranscriptionSkip = 'invalid' | 'deleted' | 'other_recording';

export type PlannedTranscription =
  { row: TranscriptionRow; skip: null } | { row: null; skip: TranscriptionSkip; problem: string };

const YOUTUBE_ID = /(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([A-Za-z0-9_-]{11})/;
const PITCH = 2;
const BAR = 4;

/** The video id of a YouTube link in any of its forms; null for anything else. */
export function youtubeId(url: string | null | undefined): string | null {
  return url?.match(YOUTUBE_ID)?.[1] ?? null;
}

/** The notes' timings belong to one recording: a song linked to another video must not get them. */
export function isSameRecording(songUrl: string | null, recordingUrl: string): boolean {
  if (!songUrl?.trim()) return true;
  const songVideo = youtubeId(songUrl);
  const recordingVideo = youtubeId(recordingUrl);
  if (songVideo && recordingVideo) return songVideo === recordingVideo;
  return songUrl.trim() === recordingUrl.trim();
}

const median = (sorted: number[]): number | null => {
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** What lists and statistics need from a track, so they never read its raw notes. */
export function trackStats(notes: TranscriptionNote[], bars: number): TrackStats {
  const pitches = notes.map((note) => note[PITCH]).sort((a, b) => a - b);
  const playedBars = new Set(notes.map((note) => note[BAR]).filter((bar) => bar >= 1));
  return {
    notes: notes.length,
    low: pitches[0] ?? null,
    high: pitches.at(-1) ?? null,
    median: median(pitches),
    per_bar: bars > 0 ? round2(notes.length / bars) : 0,
    active_share: bars > 0 ? round2(Math.min(playedBars.size / bars, 1)) : 0,
  };
}

/** The table row of one song's transcription file, or why it is not loaded. */
export function planTranscription(
  line: TranscriptionResultLine,
  file: unknown,
  song: SongRow
): PlannedTranscription {
  const parsed = TranscriptionFileSchema.safeParse(file);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path.join('.') ?? '';
    return {
      row: null,
      skip: 'invalid',
      problem: `${line.id}: file does not match the schema (${path})`,
    };
  }
  const transcription = parsed.data;
  if (song.deleted_at)
    return { row: null, skip: 'deleted', problem: `${line.id}: song is deleted` };
  if (!isSameRecording(song.youtube_url, transcription.recording_url)) {
    const problem = `${line.id}: song links ${song.youtube_url}, notes are of ${transcription.recording_url}`;
    return { row: null, skip: 'other_recording', problem };
  }
  const bars = transcription.grid.downbeats_s.length;
  const stats = Object.fromEntries(
    Object.entries(transcription.tracks).map(([track, notes]) => [track, trackStats(notes, bars)])
  );
  const noteCount = Object.values(transcription.tracks).reduce(
    (sum, notes) => sum + notes.length,
    0
  );
  return {
    row: {
      song_id: line.id,
      recording_url: transcription.recording_url,
      tool_version: transcription.tool,
      transcribed_on: transcription.created,
      note_count: noteCount,
      grid: transcription.grid as unknown as Json,
      tracks: transcription.tracks as unknown as Json,
      stats: stats as unknown as Json,
    },
    skip: null,
  };
}
