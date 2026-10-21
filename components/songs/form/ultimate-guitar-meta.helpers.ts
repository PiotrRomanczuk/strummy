import type { SongKey, SongLevel, UltimateGuitarDraft } from './ultimate-guitar.types';

/** Page metadata of an Ultimate Guitar paste: heading, difficulty, capo, key. */

/** "<Title> Chords by <Artist>" — also Tab / Ukulele Chords / Bass Tab variants. */
const HEADER =
  /^(.+?)\s+(?:ukulele\s+|bass\s+|guitar\s+pro\s+|power\s+)?(?:chords|tabs?)\s+by\s+(.+?)\s*$/i;
const VERSION_SUFFIX = /\s*\(ver\s*\d+\)\s*$/i;
const LEVELS: Record<string, SongLevel> = {
  novice: 'beginner',
  beginner: 'beginner',
  easy: 'beginner',
  intermediate: 'intermediate',
  medium: 'intermediate',
  advanced: 'advanced',
  expert: 'advanced',
  hard: 'advanced',
};

/** The key dropdown offers sharps only, so flat roots have to be respelled. */
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/** Chord → key, e.g. Bmadd4 → Bm, Cmaj7 → C, Bbm → A#m.
 * A first chord is a hint, not analysis: plenty of songs open off the tonic,
 * so this is a starting guess the teacher can correct in one click. */
export const keyFromChord = (chord: string): SongKey | undefined => {
  const parts = /^([A-G][#b]?)(.*)$/.exec(chord);
  if (!parts) return undefined;

  const root = FLAT_TO_SHARP[parts[1]] ?? parts[1];
  const isMinor = /^(?:m(?!aj)|min)/.test(parts[2]);
  return (isMinor ? `${root}m` : root) as SongKey;
};

export const metaValue = (lines: string[], field: string): string | undefined => {
  const pattern = new RegExp(`^${field}\\s*:\\s*(.*)$`, 'i');
  for (const line of lines) {
    const match = pattern.exec(line.trim());
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
};

export const parseHeader = (lines: string[]): Pick<UltimateGuitarDraft, 'title' | 'author'> => {
  // Only the first handful of lines — a lyric line could otherwise contain "by".
  for (const line of lines.slice(0, 6)) {
    const match = HEADER.exec(line.trim());
    if (match) {
      return { title: match[1].replace(VERSION_SUFFIX, '').trim(), author: match[2].trim() };
    }
  }
  return {};
};

export const parseCapo = (lines: string[]): number | undefined => {
  const raw = metaValue(lines, 'capo');
  if (!raw) return undefined;
  if (/no\s*capo/i.test(raw)) return 0;
  const fret = /(\d+)/.exec(raw);
  if (!fret) return undefined;
  const value = parseInt(fret[1], 10);
  return value >= 0 && value <= 20 ? value : undefined;
};

export const parseLevel = (lines: string[]): SongLevel | undefined => {
  const raw = metaValue(lines, 'difficulty');
  return raw ? LEVELS[raw.toLowerCase().trim()] : undefined;
};

/** An explicit "Key: Em" line beats any guess from the chords. */
export const parseKeyMeta = (lines: string[]): SongKey | undefined => {
  const raw = metaValue(lines, 'key');
  const chord = raw?.split(/\s+/)[0];
  return chord ? keyFromChord(chord) : undefined;
};
