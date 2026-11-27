/**
 * Note names in the two systems a Polish teacher meets: English (B, Bb) and Polish/German (H, B). Strummy stores
 * English names; the Polish system is a display choice.
 */

export type NoteNaming = 'en' | 'pl';

export const NOTE_NAMINGS: readonly NoteNaming[] = ['en', 'pl'];

/** Renames every B in a chord, key or note label ("Bb7" → "B7", "Bm" → "Hm", "B3" → "H3") for the Polish system. */
export function nameNotes(label: string, naming: NoteNaming): string {
  if (naming === 'en') return label;
  return label.replace(/Bb|B/g, (match) => (match === 'Bb' ? 'B' : 'H'));
}
