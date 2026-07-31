import { ZodError } from 'zod';
import { Song } from '@/schemas/SongSchema';

/**
 * Helper function to handle form validation errors
 */
export function parseZodErrors(error: unknown): Record<string, string> {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    error.issues.forEach((err) => {
      const field = err.path[0] as string;
      fieldErrors[field] = err.message;
    });
    return fieldErrors;
  }

  return {};
}

/**
 * Helper to clear a specific field error
 */
export function clearFieldError(
  errors: Record<string, string>,
  field: string
): Record<string, string> {
  const newErrors = { ...errors };
  delete newErrors[field];
  return newErrors;
}

export type SongFormData = {
  title: string;
  author: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  key: string;
  ultimate_guitar_link: string;
  chords: string;
  short_title: string;
  youtube_url: string;
  gallery_images: string[];
  cover_image_url: string;
  spotify_link_url: string;
  tiktok_short_url: string;
  capo_fret: number | null;
  strumming_pattern: string;
  category: string;
  tempo: number | null;
  time_signature: number | null;
  duration_ms: number | null;
  release_year: number | null;
  notes: string;
  lyrics_with_chords: string;
};

const FORM_DEFAULTS: SongFormData = {
  title: '',
  author: '',
  level: 'beginner' as const,
  key: 'C' as const,
  ultimate_guitar_link: '',
  chords: '',
  short_title: '',
  youtube_url: '',
  gallery_images: [],
  cover_image_url: '',
  spotify_link_url: '',
  tiktok_short_url: '',
  capo_fret: null,
  strumming_pattern: '',
  category: '',
  tempo: null,
  time_signature: null,
  duration_ms: null,
  release_year: null,
  notes: '',
  lyrics_with_chords: '',
};

/**
 * Creates default form data from a song or empty values
 */
export function createFormData(song?: Song | null): SongFormData {
  return {
    ...FORM_DEFAULTS,
    title: song?.title || '',
    author: song?.author || '',
    level: song?.level || 'beginner',
    key: song?.key || 'C',
    ultimate_guitar_link: song?.ultimate_guitar_link || '',
    chords: song?.chords || '',
    short_title: song?.short_title || '',
    youtube_url: song?.youtube_url || '',
    gallery_images: song?.gallery_images || [],
    cover_image_url: song?.cover_image_url || '',
    spotify_link_url: song?.spotify_link_url || '',
    tiktok_short_url: song?.tiktok_short_url || '',
    capo_fret: song?.capo_fret ?? null,
    strumming_pattern: song?.strumming_pattern || '',
    category: song?.category || '',
    tempo: song?.tempo ?? null,
    time_signature: song?.time_signature ?? null,
    duration_ms: song?.duration_ms ?? null,
    release_year: song?.release_year ?? null,
    notes: song?.notes || '',
    lyrics_with_chords: song?.lyrics_with_chords || '',
  };
}
