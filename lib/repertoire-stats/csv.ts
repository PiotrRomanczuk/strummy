/**
 * CSV exports of the repertoire statistics (SNG-13): the current view's list, one row per item, every field the
 * view shows. Column names are English identifiers so a spreadsheet or a script can rely on them.
 */

import { coverageOf, type GapKind } from './coverage';
import { mismatchListOf } from './mismatch-list';
import type { MismatchField } from './mismatches';
import { progressionRankingOf } from './progressions';
import type { RepertoireSong } from './repertoire-song';

type Cell = string | number | boolean | null | undefined;

const escape = (cell: Cell) => {
  const text = cell === null || cell === undefined ? '' : String(cell);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n') + '\r\n';
}

const songCells = (song: RepertoireSong): Cell[] => [
  song.id,
  song.title,
  song.author,
  song.students,
];

export function gapsCsv(songs: RepertoireSong[], only: GapKind | null): string {
  const { gaps } = coverageOf(songs);
  const rows = Object.entries(gaps)
    .filter(([kind]) => !only || kind === only)
    .flatMap(([kind, list]) => list.map((song) => [...songCells(song), kind, song.hasLink]));
  return toCsv(['song_id', 'title', 'author', 'students', 'missing', 'has_link'], rows);
}

export function mismatchesCsv(songs: RepertoireSong[], field: MismatchField | null): string {
  const list = mismatchListOf(songs, field);
  const rows = [...list.errors, ...list.explained].map(({ song, mismatch }) => [
    ...songCells(song),
    mismatch.field,
    mismatch.reason ?? 'error',
    mismatch.detail,
    mismatch.entered,
    mismatch.measured,
  ]);
  return toCsv(
    [
      'song_id',
      'title',
      'author',
      'students',
      'field',
      'verdict',
      'detail',
      'strummy',
      'recording',
    ],
    rows
  );
}

export function songsCsv(songs: RepertoireSong[]): string {
  const rows = songs.map((song) => [
    ...songCells(song),
    song.category,
    song.level,
    song.entered.tempo,
    song.measured?.bpm === null || song.measured?.bpm === undefined
      ? null
      : Math.round(song.measured.bpm),
    song.entered.key,
    song.measured?.key,
    song.entered.capo,
    song.measured?.suggestedCapo,
    song.entered.durationMs,
    song.measured?.durationMs,
    song.hasLink,
    !!song.measured,
    !!song.transcription,
  ]);
  return toCsv(
    [
      'song_id',
      'title',
      'author',
      'students',
      'category',
      'level',
      'tempo_strummy',
      'tempo_recording',
      'key_strummy',
      'key_recording',
      'capo_strummy',
      'capo_suggested',
      'duration_ms_strummy',
      'duration_ms_recording',
      'has_link',
      'has_analysis',
      'has_transcription',
    ],
    rows
  );
}

export function progressionsCsv(songs: RepertoireSong[]): string {
  const rows = progressionRankingOf(songs).flatMap((entry) =>
    entry.songs.map(({ song, bars }) => [entry.roman.join(' '), ...songCells(song), bars])
  );
  return toCsv(['progression', 'song_id', 'title', 'author', 'students', 'bars'], rows);
}
