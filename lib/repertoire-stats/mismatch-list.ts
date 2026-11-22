/**
 * The "Strummy vs recording" view model (SNG-13): one row per disagreement, errors apart from explained ones, the
 * songs most students play first. Also the per-field marks of the songs table.
 */

import { tempoAgreement } from '@/lib/music-theory/recording-agreement';

import { chordShare } from './chord-agreement';
import {
  MISMATCH_FIELDS,
  MISMATCH_REASONS,
  mismatchesOf,
  type Mismatch,
  type MismatchField,
  type MismatchReason,
} from './mismatches';
import type { RepertoireSong } from './repertoire-song';

export interface MismatchRow {
  song: RepertoireSong;
  mismatch: Mismatch;
}

export interface MismatchList {
  /** Songs with at least one disagreement of any field. */
  total: number;
  /** Songs with at least one disagreement of the field. */
  perField: Record<MismatchField, number>;
  errors: MismatchRow[];
  explained: MismatchRow[];
  errorSongs: number;
  explainedSongs: number;
  perReason: Record<MismatchReason, number>;
}

/** Most students first, then by title. */
export const byStudents = (a: RepertoireSong, b: RepertoireSong) =>
  b.students - a.students || a.title.localeCompare(b.title);

const songCount = (rows: MismatchRow[]) => new Set(rows.map((row) => row.song.id)).size;

export function mismatchListOf(songs: RepertoireSong[], field: MismatchField | null): MismatchList {
  const all = [...songs]
    .sort(byStudents)
    .flatMap((song) => mismatchesOf(song).map((mismatch) => ({ song, mismatch })));
  const shown = field ? all.filter((row) => row.mismatch.field === field) : all;
  const errors = shown.filter((row) => row.mismatch.reason === null);
  const explained = shown.filter((row) => row.mismatch.reason !== null);
  const perField = Object.fromEntries(
    MISMATCH_FIELDS.map((name) => [
      name,
      songCount(all.filter((row) => row.mismatch.field === name)),
    ])
  ) as Record<MismatchField, number>;
  const perReason = Object.fromEntries(
    MISMATCH_REASONS.map((reason) => [
      reason,
      explained.filter((row) => row.mismatch.reason === reason).length,
    ])
  ) as Record<MismatchReason, number>;
  return {
    total: songCount(all),
    perField,
    errors,
    explained,
    errorSongs: songCount(errors),
    explainedSongs: songCount(explained),
    perReason,
  };
}

export type FieldMark = 'ok' | 'error' | 'review' | 'explained' | null;

function measuredAt(song: RepertoireSong, field: MismatchField): boolean {
  const { entered, measured } = song;
  if (!measured) return false;
  if (field === 'tempo') return tempoAgreement(entered.tempo, measured.bpm) !== null;
  if (field === 'key') return !!entered.key && !!measured.key;
  if (field === 'duration') return measured.durationMatches !== null;
  return chordShare(entered.chords, entered.capo, measured.chords) !== null;
}

/** How each field of a song compares: null when one side is missing, review when only some chords are heard. */
export function fieldMarksOf(song: RepertoireSong): Record<MismatchField, FieldMark> {
  const mismatches = mismatchesOf(song);
  const markOf = (field: MismatchField): FieldMark => {
    if (!measuredAt(song, field)) return null;
    const found = mismatches.find((mismatch) => mismatch.field === field);
    if (found) return found.reason ? 'explained' : 'error';
    if (field !== 'chords' || !song.measured) return 'ok';
    const share = chordShare(song.entered.chords, song.entered.capo, song.measured.chords);
    return share !== null && share < 1 ? 'review' : 'ok';
  };
  return Object.fromEntries(MISMATCH_FIELDS.map((field) => [field, markOf(field)])) as Record<
    MismatchField,
    FieldMark
  >;
}
