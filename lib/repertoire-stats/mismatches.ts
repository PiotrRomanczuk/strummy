/**
 * Strummy's entered values against what the recording measures (SNG-13). A disagreement is either an error to fix
 * or explained: the guitar is tuned down, the song is played with a capo, the key is the relative one, the tempo is
 * counted at half or double speed, or the key detection itself was unsure.
 */

import { transposeKey } from '@/lib/music-theory/harmony-analysis';
import { keyAgreement, tempoAgreement } from '@/lib/music-theory/recording-agreement';

import { chordShare, chordShift, MIN_CHORD_SHARE } from './chord-agreement';
import type { RepertoireSong } from './repertoire-song';

export type MismatchField = 'tempo' | 'key' | 'duration' | 'chords';
export const MISMATCH_FIELDS: readonly MismatchField[] = ['tempo', 'key', 'duration', 'chords'];

export type MismatchReason =
  'tuning' | 'shifted' | 'capo' | 'relative' | 'halfDouble' | 'lowConfidence';
export const MISMATCH_REASONS: readonly MismatchReason[] = [
  'tuning',
  'shifted',
  'capo',
  'relative',
  'halfDouble',
  'lowConfidence',
];

export interface Mismatch {
  field: MismatchField;
  /** null: an error to fix; otherwise why the values differ although Strummy is probably right. */
  reason: MismatchReason | null;
  /** tuning/shifted: semitones · capo: fret · lowConfidence: key strength · tempo: % change · duration: ms change. */
  detail: number | null;
  entered: string;
  measured: string;
  /** chords only: share heard as entered, and after the shift when one explains them. */
  share?: { asEntered: number; shifted: number | null };
}

/** Below this key strength the detected key is not trusted enough to call the entered one wrong. */
export const MIN_KEY_STRENGTH = 0.6;

const TUNED_DOWN = -1;
const shiftReason = (shift: number): MismatchReason =>
  shift === TUNED_DOWN ? 'tuning' : 'shifted';

export const formatDuration = (ms: number | null): string => {
  if (ms === null) return '—';
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

function tempoMismatch(song: RepertoireSong): Mismatch | null {
  const { tempo } = song.entered;
  const bpm = song.measured?.bpm ?? null;
  const agreement = tempoAgreement(tempo, bpm);
  if (!agreement || agreement === 'same' || tempo === null || bpm === null) return null;
  const halfDouble = agreement === 'half_double';
  return {
    field: 'tempo',
    reason: halfDouble ? 'halfDouble' : null,
    detail: halfDouble ? null : Math.round(((bpm - tempo) / tempo) * 100),
    entered: String(tempo),
    measured: String(Math.round(bpm)),
  };
}

function keyReason(song: RepertoireSong, shift: number | null) {
  const { key, capo } = song.entered;
  const measured = song.measured;
  if (!key || !measured?.key) return undefined;
  if (keyAgreement(key, measured.key) === 'same') return undefined;
  const underCapo = capo > 0 ? keyAgreement(transposeKey(key, capo), measured.key) : null;
  if (underCapo === 'same') return { reason: 'capo' as const, detail: capo };
  if (keyAgreement(key, measured.key) === 'relative' || underCapo === 'relative') {
    return { reason: 'relative' as const, detail: null };
  }
  if (
    shift !== null &&
    keyAgreement(transposeKey(key, capo + shift), measured.key) !== 'different'
  ) {
    return { reason: shiftReason(shift), detail: shift };
  }
  const strength = measured.keyStrength;
  if (strength !== null && strength < MIN_KEY_STRENGTH) {
    return { reason: 'lowConfidence' as const, detail: strength };
  }
  return { reason: null, detail: null };
}

function keyMismatch(song: RepertoireSong, shift: number | null): Mismatch | null {
  const found = keyReason(song, shift);
  if (!found) return null;
  const { key, capo } = song.entered;
  return {
    field: 'key',
    ...found,
    entered: capo > 0 ? `${key} capo ${capo}` : (key ?? ''),
    measured: song.measured?.key ?? '',
  };
}

function durationMismatch(song: RepertoireSong): Mismatch | null {
  const measured = song.measured;
  if (measured?.durationMatches !== false) return null;
  const { durationMs } = song.entered;
  return {
    field: 'duration',
    reason: null,
    detail:
      durationMs !== null && measured.durationMs !== null ? measured.durationMs - durationMs : null,
    entered: formatDuration(durationMs),
    measured: formatDuration(measured.durationMs),
  };
}

function chordsMismatch(
  song: RepertoireSong,
  shifted: { shift: number; share: number } | null
): Mismatch | null {
  const measured = song.measured;
  if (!measured) return null;
  const share = chordShare(song.entered.chords, song.entered.capo, measured.chords);
  if (share === null || share >= MIN_CHORD_SHARE) return null;
  return {
    field: 'chords',
    reason: shifted ? shiftReason(shifted.shift) : null,
    detail: shifted?.shift ?? null,
    entered: song.entered.chords ?? '',
    measured: measured.chords.join(', '),
    share: { asEntered: share, shifted: shifted?.share ?? null },
  };
}

/** Every disagreement of one song; a song without a measurement has none. */
export function mismatchesOf(song: RepertoireSong): Mismatch[] {
  if (!song.measured) return [];
  const shifted = chordShift(song.entered.chords, song.entered.capo, song.measured.chords);
  return [
    tempoMismatch(song),
    keyMismatch(song, shifted?.shift ?? null),
    durationMismatch(song),
    chordsMismatch(song, shifted),
  ].filter((mismatch): mismatch is Mismatch => mismatch !== null);
}
