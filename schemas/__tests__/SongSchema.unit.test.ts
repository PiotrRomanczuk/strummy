/**
 * SongSchema Tests
 *
 * Tests validation for song-related Zod schemas:
 * - SongSchema (full song validation)
 * - SongInputSchema (create operations)
 * - SongUpdateSchema (partial updates)
 * - SongFilterSchema (filtering)
 * - SongSearchSchema (search operations)
 *
 * @see schemas/SongSchema.ts
 */

import {
  SongSchema,
  SongInputSchema,
  SongUpdateSchema,
  SongFilterSchema,
  SongSearchSchema,
  SongSortSchema,
  SongImportSchema,
  SongExportSchema,
} from '../SongSchema';

describe('SongSchema', () => {
  describe('SongInputSchema', () => {
    const validSongInput = {
      title: 'Wonderwall',
      author: 'Oasis',
      level: 'beginner',
      key: 'C',
      ultimate_guitar_link: null,
      youtube_url: null,
    };

    it('should validate a valid song input', () => {
      const result = SongInputSchema.safeParse(validSongInput);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        title: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Validation.titleRequired');
      }
    });

    it('should require author', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        author: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Validation.authorRequired');
      }
    });

    it('should validate title max length', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        title: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Validation.titleTooLong');
      }
    });

    it('should validate author max length', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        author: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Validation.authorNameTooLong');
      }
    });

    it('should validate level enum', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        level: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid levels', () => {
      const levels = ['beginner', 'intermediate', 'advanced'];
      for (const level of levels) {
        const result = SongInputSchema.safeParse({
          ...validSongInput,
          level,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should validate key enum', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        key: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid keys including minors', () => {
      const keys = ['C', 'C#', 'D', 'Am', 'Bm', 'F#m'];
      for (const key of keys) {
        const result = SongInputSchema.safeParse({
          ...validSongInput,
          key,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept valid URL for youtube', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        youtube_url: 'https://youtube.com/watch?v=123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty string for URL fields', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        youtube_url: '',
        spotify_link_url: '',
      });
      expect(result.success).toBe(true);
    });

    it('should validate optional numeric fields', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        capo_fret: 5,
        tempo: 120,
        time_signature: 4,
        duration_ms: 180000,
        release_year: 1995,
      });
      expect(result.success).toBe(true);
    });

    it('should reject capo_fret out of range', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        capo_fret: 25,
      });
      expect(result.success).toBe(false);
    });

    it('should reject tempo out of range', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        tempo: 500,
      });
      expect(result.success).toBe(false);
    });

    it('should reject release_year out of range', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        release_year: 1400,
      });
      expect(result.success).toBe(false);
    });

    it('should accept audio_files as record', () => {
      const result = SongInputSchema.safeParse({
        ...validSongInput,
        audio_files: {
          acoustic: 'https://example.com/acoustic.mp3',
          electric: 'https://example.com/electric.mp3',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('SongUpdateSchema', () => {
    it('should require id for updates', () => {
      const result = SongUpdateSchema.safeParse({
        title: 'Updated Title',
      });
      expect(result.success).toBe(false);
    });

    it('should allow partial updates with id', () => {
      const result = SongUpdateSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });

    it('should validate id is UUID', () => {
      const result = SongUpdateSchema.safeParse({
        id: 'not-a-uuid',
        title: 'Updated Title',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SongFilterSchema', () => {
    it('should validate empty filter', () => {
      const result = SongFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate filter by level', () => {
      const result = SongFilterSchema.safeParse({
        level: 'beginner',
      });
      expect(result.success).toBe(true);
    });

    it('should validate filter by key', () => {
      const result = SongFilterSchema.safeParse({
        key: 'Am',
      });
      expect(result.success).toBe(true);
    });

    it('should validate search string', () => {
      const result = SongFilterSchema.safeParse({
        search: 'wonderwall',
      });
      expect(result.success).toBe(true);
    });

    it('should validate has_audio boolean', () => {
      const result = SongFilterSchema.safeParse({
        has_audio: true,
      });
      expect(result.success).toBe(true);
    });

    it('should validate multiple filters', () => {
      const result = SongFilterSchema.safeParse({
        level: 'intermediate',
        key: 'G',
        author: 'Oasis',
        has_chords: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('SongSortSchema', () => {
    it('should validate sort by title', () => {
      const result = SongSortSchema.safeParse({
        field: 'title',
        direction: 'asc',
      });
      expect(result.success).toBe(true);
    });

    it('should default direction to desc', () => {
      const result = SongSortSchema.safeParse({
        field: 'created_at',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.direction).toBe('desc');
      }
    });

    it('should reject invalid sort field', () => {
      const result = SongSortSchema.safeParse({
        field: 'invalid_field',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SongSearchSchema', () => {
    it('should require query', () => {
      const result = SongSearchSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should validate query with fields', () => {
      const result = SongSearchSchema.safeParse({
        query: 'wonderwall',
        fields: ['title', 'author'],
      });
      expect(result.success).toBe(true);
    });

    it('should validate query with level filter', () => {
      const result = SongSearchSchema.safeParse({
        query: 'rock',
        level: 'intermediate',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('SongImportSchema', () => {
    it('should validate import with array of songs', () => {
      const result = SongImportSchema.safeParse({
        songs: [
          {
            title: 'Song 1',
            author: 'Author 1',
            level: 'beginner',
            key: 'C',
            ultimate_guitar_link: null,
            youtube_url: null,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should default overwrite to false', () => {
      const result = SongImportSchema.safeParse({
        songs: [],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overwrite).toBe(false);
      }
    });

    it('should validate validate_only flag', () => {
      const result = SongImportSchema.safeParse({
        songs: [],
        validate_only: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validate_only).toBe(true);
      }
    });
  });

  describe('SongExportSchema', () => {
    it('should default format to json', () => {
      const result = SongExportSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe('json');
      }
    });

    it('should accept csv format', () => {
      const result = SongExportSchema.safeParse({
        format: 'csv',
      });
      expect(result.success).toBe(true);
    });

    it('should accept pdf format', () => {
      const result = SongExportSchema.safeParse({
        format: 'pdf',
      });
      expect(result.success).toBe(true);
    });

    it('should accept filters for export', () => {
      const result = SongExportSchema.safeParse({
        format: 'json',
        filters: {
          level: 'beginner',
        },
        include_lessons: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('SongSchema (full)', () => {
    it('should validate a complete song', () => {
      const result = SongSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Wonderwall',
        author: 'Oasis',
        level: 'beginner',
        key: 'C',
        ultimate_guitar_link: null,
        youtube_url: 'https://youtube.com/watch?v=123',
        cover_image_url: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      expect(result.success).toBe(true);
    });

    it('should allow optional id', () => {
      const result = SongSchema.safeParse({
        title: 'Wonderwall',
        author: 'Oasis',
        level: 'beginner',
        key: 'C',
        ultimate_guitar_link: null,
        youtube_url: null,
      });
      expect(result.success).toBe(true);
    });
  });
});
