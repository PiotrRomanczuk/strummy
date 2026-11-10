/** Key spelling for the song-analysis backfill: song2logic's key -> `music_key`, and how two keys relate. */

export type KeyAgreement = 'same' | 'relative' | 'different';

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
