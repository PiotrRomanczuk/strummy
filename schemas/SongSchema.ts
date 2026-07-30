import * as z from 'zod';
import { DifficultyLevelEnum, MusicKeyEnum, URLField } from './CommonSchema';
import { VALIDATION_KEYS as V } from './shared/validation-keys';

// Song schema for validation
export const SongSchema = z.object({
  id: z.string().uuid().optional(), // UUID, auto-generated
  title: z.string().min(1, V.titleRequired).max(200, V.titleTooLong),
  author: z.string().min(1, V.authorRequired).max(100, V.authorNameTooLong),
  level: DifficultyLevelEnum,
  key: MusicKeyEnum,
  chords: z.string().optional(),
  audio_files: z.record(z.string(), z.string()).optional(), // JSONB field - key: audio type, value: URL
  ultimate_guitar_link: URLField,
  youtube_url: URLField,
  gallery_images: z.array(z.string()).optional(),
  cover_image_url: URLField.optional().or(z.literal('')).nullable(),
  spotify_link_url: URLField.optional().or(z.literal('')),
  tiktok_short_url: URLField.optional().or(z.literal('')),
  capo_fret: z.number().int().min(0).max(20).optional().nullable(),
  strumming_pattern: z.string().max(100).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  tempo: z.number().int().min(0).max(300).optional().nullable(),
  time_signature: z.number().int().min(1).max(16).optional().nullable(),
  duration_ms: z.number().int().min(0).optional().nullable(),
  release_year: z.number().int().min(1500).max(2100).optional().nullable(),
  short_title: z.string().max(50, V.shortTitleTooLong).optional(),
  notes: z.string().optional().nullable(),
  lyrics_with_chords: z.string().optional().nullable(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Song input schema for creating/updating songs
export const SongInputSchema = z.object({
  title: z.string().min(1, V.titleRequired).max(200, V.titleTooLong),
  author: z.string().min(1, V.authorRequired).max(100, V.authorNameTooLong),
  level: DifficultyLevelEnum,
  key: MusicKeyEnum,
  chords: z.string().optional(),
  ultimate_guitar_link: URLField,
  youtube_url: URLField,
  gallery_images: z.array(z.string()).optional(),
  cover_image_url: URLField.optional().or(z.literal('')).nullable(),
  audio_files: z.record(z.string(), z.string()).optional(), // key: audio type, value: URL
  spotify_link_url: URLField.optional().or(z.literal('')),
  tiktok_short_url: URLField.optional().or(z.literal('')),
  capo_fret: z.number().int().min(0).max(20).optional().nullable(),
  strumming_pattern: z.string().max(100).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  tempo: z.number().int().min(0).max(300).optional().nullable(),
  time_signature: z.number().int().min(1).max(16).optional().nullable(),
  duration_ms: z.number().int().min(0).optional().nullable(),
  release_year: z.number().int().min(1500).max(2100).optional().nullable(),
  short_title: z.string().max(50, V.shortTitleTooLong).optional(),
  notes: z.string().optional().nullable(),
  lyrics_with_chords: z.string().optional().nullable(),
});

// Song draft schema (minimal validation for quick capture)
export const SongDraftSchema = z.object({
  title: z.string().min(1, V.titleRequired).max(200, V.titleTooLong),
  author: z.string().max(100, V.authorNameTooLong).optional(),
  level: DifficultyLevelEnum.optional(),
  key: MusicKeyEnum.optional(),
  chords: z.string().optional(),
  ultimate_guitar_link: URLField,
  youtube_url: URLField,
  gallery_images: z.array(z.string()).optional(),
  cover_image_url: URLField.optional().or(z.literal('')).nullable(),
  audio_files: z.record(z.string(), z.string()).optional(),
  spotify_link_url: URLField.optional().or(z.literal('')),
  tiktok_short_url: URLField.optional().or(z.literal('')),
  capo_fret: z.number().int().min(0).max(20).optional().nullable(),
  strumming_pattern: z.string().max(100).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  tempo: z.number().int().min(0).max(300).optional().nullable(),
  time_signature: z.number().int().min(1).max(16).optional().nullable(),
  duration_ms: z.number().int().min(0).optional().nullable(),
  release_year: z.number().int().min(1500).max(2100).optional().nullable(),
  short_title: z.string().max(50, V.shortTitleTooLong).optional(),
  notes: z.string().optional().nullable(),
  lyrics_with_chords: z.string().optional().nullable(),
  is_draft: z.literal(true),
});

// Song update schema (for partial updates)
export const SongUpdateSchema = SongInputSchema.partial().extend({
  id: z.string().uuid(V.songIdRequired),
});

// Song with lesson information
export const SongWithLessonsSchema = SongSchema.extend({
  lessons: z
    .array(
      z.object({
        lesson_id: z.string().uuid(),
        song_status: z.enum(['to_learn', 'started', 'remembered', 'with_author', 'mastered']),
        created_at: z.date().optional(),
      })
    )
    .optional(),
});

// Song filter schema
export const SongFilterSchema = z.object({
  level: DifficultyLevelEnum.optional(),
  key: MusicKeyEnum.optional(),
  author: z.string().optional(),
  search: z.string().optional(),
  has_audio: z.boolean().optional(),
  has_chords: z.boolean().optional(),
});

// Song sort schema
export const SongSortSchema = z.object({
  field: z.enum(['title', 'author', 'level', 'key', 'created_at', 'updated_at']),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

// Song search schema
export const SongSearchSchema = z.object({
  query: z.string().min(1, V.searchQueryRequired),
  fields: z.array(z.enum(['title', 'author', 'chords'])).optional(),
  level: DifficultyLevelEnum.optional(),
  key: MusicKeyEnum.optional(),
});

// Song search parameters schema (for API routes)
export const SongSearchParamsSchema = z.object({
  q: z.string().optional(),
  level: DifficultyLevelEnum.optional(),
  key: MusicKeyEnum.optional(),
  author: z.string().optional(),
  hasAudio: z.string().optional(),
  hasChords: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// Song import schema (for bulk operations)
export const SongImportSchema = z.object({
  songs: z.array(SongInputSchema),
  overwrite: z.boolean().default(false),
  validate_only: z.boolean().default(false),
});

// Song import validation schema (for validation mode)
export const SongImportValidationSchema = z.object({
  songs: z.array(z.record(z.string(), z.unknown())), // Accepts objects for validation before type checking
  overwrite: z.boolean().default(false),
  validate_only: z.boolean().default(false),
});

// Song export schema
export const SongExportSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  filters: SongFilterSchema.optional(),
  include_lessons: z.boolean().default(false),
  include_audio_urls: z.boolean().default(false),
});

// Song statistics schema
export const SongStatsSchema = z.object({
  total_songs: z.number().int().nonnegative(),
  songs_by_level: z.record(z.string(), z.number()),
  songs_by_key: z.record(z.string(), z.number()),
  songs_with_audio: z.number().int().nonnegative(),
  songs_with_chords: z.number().int().nonnegative(),
  average_songs_per_author: z.number().positive(),
});

// Types
export type Song = z.infer<typeof SongSchema>;
export type SongInput = z.infer<typeof SongInputSchema>;
export type SongUpdate = z.infer<typeof SongUpdateSchema>;
export type SongWithLessons = z.infer<typeof SongWithLessonsSchema>;
export type SongFilter = z.infer<typeof SongFilterSchema>;
export type SongSort = z.infer<typeof SongSortSchema>;
export type SongSearch = z.infer<typeof SongSearchSchema>;
export type SongSearchParams = z.infer<typeof SongSearchParamsSchema>;
export type SongImport = z.infer<typeof SongImportSchema>;
export type SongImportValidation = z.infer<typeof SongImportValidationSchema>;
export type SongExport = z.infer<typeof SongExportSchema>;
export type SongStats = z.infer<typeof SongStatsSchema>;
