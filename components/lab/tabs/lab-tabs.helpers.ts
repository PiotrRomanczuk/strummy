const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** MIDI note number → scientific pitch ("40" → "E2"). */
export function midiNote(value: number): string {
  return `${NOTE_NAMES[((value % 12) + 12) % 12]}${Math.floor(value / 12) - 1}`;
}

/** Guitar Pro lists strings high to low; people read a tuning low to high ("E2 A2 D3 G3 B3 E4"). */
export function tuningLabel(tuning: number[]): string {
  return [...tuning].reverse().map(midiNote).join(' ');
}

/** "bend 12 · slide 4", most used first. */
export function techniquesLabel(techniques: Record<string, number> | undefined): string {
  return Object.entries(techniques ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name.replace(/_/g, ' ')} ${count}`)
    .join(' · ');
}

export const TAB_KINDS = ['all', 'songs', 'exercises'] as const;
export type TabKind = (typeof TAB_KINDS)[number];

export function tabKind(value: string): TabKind {
  return (TAB_KINDS as readonly string[]).includes(value) ? (value as TabKind) : 'all';
}

/** Index of the track to show first: a played guitar part (MIDI programs 24–31), else any played string part. */
export function firstGuitarTrack(
  tracks: { notes: number; tuning: number[]; instrument?: number; percussion?: boolean }[]
): number {
  const played = (track: (typeof tracks)[number]) => track.notes > 0 && !track.percussion;
  const guitar = tracks.findIndex(
    (track) => played(track) && (track.instrument ?? -1) >= 24 && (track.instrument ?? -1) <= 31
  );
  if (guitar >= 0) return guitar;
  const strings = tracks.findIndex((track) => played(track) && track.tuning.length >= 6);
  return Math.max(strings, 0);
}
