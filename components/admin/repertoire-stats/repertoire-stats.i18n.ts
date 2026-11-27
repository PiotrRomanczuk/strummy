import { nameNotes, type NoteNaming } from '@/lib/music-theory/note-naming';
import { knownChords, triad } from '@/lib/repertoire-stats/chord-agreement';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** "Eb moll" / "E minor": a key label in the chosen note names; the mode words come from the messages. */
export function keyLabel(key: string | null, names: NoteNaming, t: Translate): string {
  if (!key) return '—';
  const isMinor = key.endsWith('m');
  const root = nameNotes(isMinor ? key.slice(0, -1) : key, names);
  return t(isMinor ? 'key.minor' : 'key.major', { root });
}

/** Semitones with their sign, the minus a real minus sign: "−1", "+5". */
export const signed = (value: number) => (value > 0 ? `+${value}` : `−${Math.abs(value)}`);

export const decimal = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);

/** The scale degree of each chord, read from the recording's own progressions; '' where song2logic gave none. */
export function degreesOf(song: RepertoireSong, chords: string[], shift: number): string[] {
  const romanOf = new Map<string, string>();
  for (const progression of song.measured?.progressions ?? []) {
    progression.chords.forEach((chord, i) => {
      const parsed = knownChords(chord)[0];
      if (parsed && progression.roman[i]) romanOf.set(triad(parsed, 0), progression.roman[i]);
    });
  }
  return chords.map((chord) => {
    const parsed = knownChords(chord)[0];
    return parsed ? (romanOf.get(triad(parsed, shift)) ?? '') : '';
  });
}
