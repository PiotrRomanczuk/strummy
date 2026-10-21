import type { Database } from '@/types/database.types';

export type SongLevel = Database['public']['Enums']['difficulty_level'];
export type SongKey = Database['public']['Enums']['music_key'];

/** Everything a pasted Ultimate Guitar page can contribute to the song form.
 * Every field is optional: a paste may be a full page or just the bare tab. */
export type UltimateGuitarDraft = {
  /** UG publishes a song as a chord sheet ("Chords by") or as tablature ("Tab by"). */
  pageType: 'chords' | 'tab';
  title?: string;
  author?: string;
  level?: SongLevel;
  key?: SongKey;
  capoFret?: number;
  chords: string[];
  lyricsWithChords?: string;
  /** Tablature from a "tabs" page; never mixed into lyricsWithChords. */
  tabNotation?: string;
  ultimateGuitarLink?: string;
};
