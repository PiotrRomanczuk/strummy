/**
 * Strummy's entered values against what the recording measures (SNG-13). Entered chords are guitar shapes, so they
 * are compared with the sounding chords after transposing by the capo; an entered key matches when it is either the
 * sounding key or the shape key under the capo.
 */

import { parseChordsColumn } from '@/lib/music-theory/chord-parser';
import { NOTE_TO_SEMITONE } from '@/lib/music-theory/chromatic';
import { transposeKey } from '@/lib/music-theory/harmony-analysis';
import { keyAgreement, tempoAgreement } from '@/lib/music-theory/recording-agreement';

import type { RepertoireSong } from './repertoire-song';

export type MismatchKind = 'tempo' | 'key' | 'duration' | 'chords';

export interface Mismatch {
  kind: MismatchKind;
  /** tempo: half_double | different · key: relative | different · duration: different · chords: share heard */
  verdict: string;
  entered: string;
  measured: string;
}

/** Below this share of entered chords heard in the recording, the chords are listed as a mismatch. */
export const MIN_CHORD_SHARE = 0.6;

const triad = (root: string, isMinor: boolean, shift: number) =>
  `${((NOTE_TO_SEMITONE[root] ?? 0) + shift + 120) % 12}${isMinor ? 'm' : ''}`;

/** Share of the entered chords (as sounding triads) that the recording's main chords contain; null without both. */
export function chordShare(
  entered: string | null,
  capo: number,
  measured: string[]
): number | null {
  const shapes = parseChordsColumn(entered).filter((chord) => chord.root in NOTE_TO_SEMITONE);
  const heard = parseChordsColumn(measured.join(', ')).filter(
    (chord) => chord.root in NOTE_TO_SEMITONE
  );
  if (shapes.length === 0 || heard.length === 0) return null;
  const heardTriads = new Set(
    heard.map((chord) => triad(chord.root, chord.quality === 'minor', 0))
  );
  const sounding = new Set(
    shapes.map((chord) => triad(chord.root, chord.quality === 'minor', capo))
  );
  const found = [...sounding].filter((chord) => heardTriads.has(chord)).length;
  return Math.round((found / sounding.size) * 100) / 100;
}

function keyVerdict(entered: string | null, capo: number, measured: string | null) {
  if (!entered || !measured) return null;
  const direct = keyAgreement(entered, measured);
  if (direct === 'same') return 'same';
  if (capo > 0 && keyAgreement(transposeKey(entered, capo), measured) === 'same') return 'same';
  return direct;
}

const minutes = (ms: number | null) =>
  ms
    ? `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`
    : '—';

/** Every disagreement of one song; a song without a measurement has none. */
export function mismatchesOf(song: RepertoireSong): Mismatch[] {
  const { entered, measured } = song;
  if (!measured) return [];
  const found: Mismatch[] = [];
  const tempo = tempoAgreement(entered.tempo, measured.bpm);
  if (tempo && tempo !== 'same') {
    found.push({
      kind: 'tempo',
      verdict: tempo,
      entered: String(entered.tempo),
      measured: String(Math.round(measured.bpm ?? 0)),
    });
  }
  const key = keyVerdict(entered.key, entered.capo, measured.key);
  if (key && key !== 'same') {
    const capo = entered.capo > 0 ? ` (capo ${entered.capo})` : '';
    found.push({
      kind: 'key',
      verdict: key,
      entered: `${entered.key}${capo}`,
      measured: measured.key ?? '',
    });
  }
  if (measured.durationMatches === false) {
    found.push({
      kind: 'duration',
      verdict: 'different',
      entered: minutes(entered.durationMs),
      measured: minutes(measured.durationMs),
    });
  }
  const share = chordShare(entered.chords, entered.capo, measured.chords);
  if (share !== null && share < MIN_CHORD_SHARE) {
    found.push({
      kind: 'chords',
      verdict: String(share),
      entered: entered.chords ?? '',
      measured: measured.chords.join(', '),
    });
  }
  return found;
}

/** Songs with at least one disagreement, most first. */
export function songsWithMismatches(songs: RepertoireSong[]) {
  return songs
    .map((song) => ({ song, mismatches: mismatchesOf(song) }))
    .filter(({ mismatches }) => mismatches.length > 0)
    .sort(
      (a, b) =>
        b.mismatches.length - a.mismatches.length || a.song.title.localeCompare(b.song.title)
    );
}
