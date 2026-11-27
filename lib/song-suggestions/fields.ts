/**
 * Which song fields an AI model may propose (SNG-15) and what counts as a usable value. Only fields a model can know
 * from the song itself: the genre, the difficulty and the artist. Tempo, key and chords come from the recording
 * (SNG-14), never from a model.
 */

import { CANONICAL_GENRES, isCanonicalGenre } from '@/lib/data-quality/song-genres';
import { DifficultyLevelEnum } from '@/schemas/CommonSchema';

export const SUGGEST_FIELDS = ['category', 'level', 'author'] as const;
export type SuggestField = (typeof SUGGEST_FIELDS)[number];

/** The data-quality rules each field answers: their fix-queue rows get the "suggest" button. */
export const RULES_OF: Record<SuggestField, readonly string[]> = {
  category: ['song.genre', 'song.genre-canonical'],
  level: ['song.level'],
  author: ['song.author'],
};

/** What a model is told about a song. Nothing about students. */
export interface SuggestSong {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  level: string | null;
  chords: string | null;
  tempo: number | null;
  key: string | null;
}

/** An AI proposal waiting for an admin's decision. */
export interface PendingSuggestion {
  id: string;
  songId: string;
  field: SuggestField;
  value: string;
  confidence: number;
  reason: string | null;
  /** "claude:<model>" or "local:<model>". */
  source: string;
}

/** Proposals at or above this confidence may be accepted in one go. */
export const CONFIDENT = 0.8;

const AUTHOR_MAX = 100;
/** "I don't know" in the model's words is not an artist. */
const NO_ARTIST = /^(unknown|nieznany|nieznana|brak|n\/a|none|-+)$/i;
const hasText = (value: string | null): value is string => !!value && value.trim().length > 0;

/** Whether the field is empty or non-standard, so a suggestion may fill it. */
export function needsValue(song: SuggestSong, field: SuggestField): boolean {
  if (field === 'category')
    return !hasText(song.category) || !isCanonicalGenre(song.category.trim());
  if (field === 'level') return !song.level;
  return !hasText(song.author);
}

/** A model's answer as a value Strummy stores — a listed genre, a known level, a short artist name — or null. */
export function normaliseValue(field: SuggestField, raw: string): string | null {
  const value = raw.trim();
  if (field === 'category') {
    return CANONICAL_GENRES.find((genre) => genre.toLowerCase() === value.toLowerCase()) ?? null;
  }
  if (field === 'level') return DifficultyLevelEnum.safeParse(value.toLowerCase()).data ?? null;
  return value.length > 0 && value.length <= AUTHOR_MAX && !NO_ARTIST.test(value) ? value : null;
}

/** Turns a suggested value into the `songs` update for its field. */
export const songChange = (field: SuggestField, value: string) =>
  field === 'category'
    ? { category: value }
    : field === 'level'
      ? { level: DifficultyLevelEnum.parse(value) }
      : { author: value };
