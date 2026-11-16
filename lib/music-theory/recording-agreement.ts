/**
 * How a song's entered data agrees with what its recording measures (song2logic): key spelling and relation,
 * duration, tempo. Used by the song-analysis backfill and the admin repertoire statistics (SNG-13).
 */

export type KeyAgreement = 'same' | 'relative' | 'different';
export type TempoAgreement = 'same' | 'half_double' | 'different';

const PITCH_CLASSES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ENHARMONIC: Record<string, string> = {
  Db: 'C#',
  'D#': 'Eb',
  Gb: 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
};

function pitchClass(note: string): number {
  return PITCH_CLASSES.indexOf(ENHARMONIC[note] ?? note);
}

/** song2logic's key as a `music_key` enum label: {Eb, minor} -> "Ebm". The enum has no "Abm", only "G#m". */
export function musicKey(key: { tonic: string; scale: string }): string {
  if (key.scale !== 'minor') return key.tonic;
  return key.tonic === 'Ab' ? 'G#m' : `${key.tonic}m`;
}

/** "same" also across enharmonic spellings; "relative" for a major key and its relative minor. */
export function keyAgreement(songKey: string | null, detected: string): KeyAgreement | null {
  if (!songKey) return null;
  const parse = (label: string) => ({
    root: pitchClass(label.replace(/m$/, '')),
    isMinor: label.endsWith('m'),
  });
  const [stored, heard] = [parse(songKey), parse(detected)];
  if (stored.root === heard.root && stored.isMinor === heard.isMinor) return 'same';
  if (stored.isMinor === heard.isMinor) return 'different';
  const [major, minor] = stored.isMinor ? [heard, stored] : [stored, heard];
  return (major.root + 9) % 12 === minor.root ? 'relative' : 'different';
}

// A recording may differ from the song's Spotify length by this share, or this many ms, whichever is more.
const DURATION_TOLERANCE = 0.04;
const DURATION_TOLERANCE_MS = 6000;
// Tempos agree within this share of the measured tempo (a beat tracker is rarely exact; teachers round).
const TEMPO_TOLERANCE = 0.03;

export function durationMatches(
  songDurationMs: number | null,
  sourceDurationS?: number
): boolean | null {
  if (!songDurationMs || !sourceDurationS) return null;
  const slack = Math.max(DURATION_TOLERANCE * songDurationMs, DURATION_TOLERANCE_MS);
  return Math.abs(sourceDurationS * 1000 - songDurationMs) <= slack;
}

/** "half_double" when one tempo counts the other's half beats — the commonest tempo disagreement. */
export function tempoAgreement(
  songTempo: number | null,
  measuredBpm: number | null
): TempoAgreement | null {
  if (!songTempo || !measuredBpm) return null;
  const isNear = (value: number) => Math.abs(value - measuredBpm) <= TEMPO_TOLERANCE * measuredBpm;
  if (isNear(songTempo)) return 'same';
  return isNear(songTempo * 2) || isNear(songTempo / 2) ? 'half_double' : 'different';
}
