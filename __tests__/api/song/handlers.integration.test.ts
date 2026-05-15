/**
 * Integration tests for Song API handler functions.
 *
 * Tests pure handler functions directly with mock Supabase clients,
 * replacing unreliable browser-level E2E tests with fast, deterministic
 * integration tests that exercise real business logic + Zod validation.
 */

import {
  getSongsHandler,
  createSongHandler,
  updateSongHandler,
  deleteSongHandler,
  validateMutationPermission,
} from '@/app/api/(curriculum)/song/handlers';
import { createMockAuthContext } from '@/lib/testing/integration-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SONG_UUID = '00000000-2222-4000-a000-000000000020';

/** Build a chainable Supabase query builder where the terminal call resolves. */
function buildQueryBuilder(
  resolvedData: unknown = [],
  resolvedError: unknown = null,
  resolvedCount: number | null = null
) {
  const builder: Record<string, jest.Mock> = {};

  const chainable = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'is', 'or', 'ilike',
    'gte', 'lte', 'order', 'range', 'limit',
  ];

  for (const m of chainable) {
    builder[m] = jest.fn().mockReturnValue(builder);
  }

  // Terminal methods
  builder.single = jest.fn().mockResolvedValue({
    data: Array.isArray(resolvedData) ? resolvedData[0] : resolvedData,
    error: resolvedError,
  });
  builder.maybeSingle = jest.fn().mockResolvedValue({
    data: Array.isArray(resolvedData) ? resolvedData[0] : resolvedData,
    error: resolvedError,
  });

  // The query builder is awaitable (range() is the terminal call in getSongs)
  // Make range resolve like a promise
  builder.range = jest.fn().mockResolvedValue({
    data: resolvedData,
    error: resolvedError,
    count: resolvedCount ?? (Array.isArray(resolvedData) ? resolvedData.length : 0),
  });

  // Re-wire chainable methods (except range) to return builder
  for (const m of chainable.filter((c) => c !== 'range')) {
    builder[m].mockReturnValue(builder);
  }

  return builder;
}

function buildMockSupabase(queryBuilder: ReturnType<typeof buildQueryBuilder>) {
  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    rpc: jest.fn(),
  };
}

/** Minimal valid song input that passes SongInputSchema */
const validSongInput = {
  title: 'Wonderwall',
  author: 'Oasis',
  level: 'intermediate' as const,
  key: 'Em' as const,
  ultimate_guitar_link: 'https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-chords-27596',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Song Handlers – Integration Tests', () => {
  afterEach(() => jest.clearAllMocks());

  // =======================================================================
  // getSongsHandler
  // =======================================================================
  describe('getSongsHandler', () => {
    const mockSongs = [
      { id: '1', title: 'Song A', level: 'beginner', key: 'C', deleted_at: null },
      { id: '2', title: 'Song B', level: 'intermediate', key: 'Am', deleted_at: null },
      { id: '3', title: 'Song C', level: 'advanced', key: 'G', deleted_at: null },
    ];

    it('returns songs for authenticated teacher', async () => {
      const qb = buildQueryBuilder(mockSongs);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await getSongsHandler(supabase, user, profileMapped, {});

      expect(result).toMatchObject({ songs: mockSongs, status: 200 });
      expect(supabase.from).toHaveBeenCalledWith('songs');
    });

    it('returns songs for authenticated student (read-only)', async () => {
      const qb = buildQueryBuilder(mockSongs);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('student');

      const result = await getSongsHandler(supabase, user, profileMapped, {});

      expect(result).toMatchObject({ songs: mockSongs, status: 200 });
    });

    it('returns 401 when user is null', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);

      const result = await getSongsHandler(supabase, null, null, {});

      expect(result).toEqual({ error: 'Unauthorized', status: 401 });
    });

    it('filters by level', async () => {
      const qb = buildQueryBuilder([mockSongs[0]]);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      await getSongsHandler(supabase, user, profileMapped, { level: 'beginner' });

      expect(qb.eq).toHaveBeenCalledWith('level', 'beginner');
    });

    it('filters by key', async () => {
      const qb = buildQueryBuilder([mockSongs[1]]);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      await getSongsHandler(supabase, user, profileMapped, { key: 'Am' });

      expect(qb.eq).toHaveBeenCalledWith('key', 'Am');
    });

    it('filters by search term using ilike', async () => {
      const qb = buildQueryBuilder([]);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      await getSongsHandler(supabase, user, profileMapped, { search: 'wonder' });

      expect(qb.ilike).toHaveBeenCalledWith('title', '%wonder%');
    });

    it('combines multiple filters', async () => {
      const qb = buildQueryBuilder([]);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      await getSongsHandler(supabase, user, profileMapped, {
        level: 'beginner',
        key: 'C',
        search: 'test',
      });

      expect(qb.eq).toHaveBeenCalledWith('level', 'beginner');
      expect(qb.eq).toHaveBeenCalledWith('key', 'C');
      expect(qb.ilike).toHaveBeenCalledWith('title', '%test%');
    });

    it('sorts by title ascending (validates against allowlist)', async () => {
      const qb = buildQueryBuilder(mockSongs);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      await getSongsHandler(supabase, user, profileMapped, {
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(qb.order).toHaveBeenCalledWith('title', { ascending: true });
    });

    it('falls back to created_at for invalid sort field', async () => {
      const qb = buildQueryBuilder(mockSongs);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      await getSongsHandler(supabase, user, profileMapped, {
        sortBy: 'DROP TABLE songs;--',
      });

      expect(qb.order).toHaveBeenCalledWith('created_at', expect.any(Object));
    });

    it('paginates with page/limit using range()', async () => {
      const qb = buildQueryBuilder(mockSongs, null, 100);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      await getSongsHandler(supabase, user, profileMapped, { page: 3, limit: 10 });

      // page 3, limit 10 → offset 20, range(20, 29)
      expect(qb.range).toHaveBeenCalledWith(20, 29);
    });

    it('excludes soft-deleted songs', async () => {
      const qb = buildQueryBuilder(mockSongs);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      await getSongsHandler(supabase, user, profileMapped, {});

      expect(qb.is).toHaveBeenCalledWith('deleted_at', null);
    });
  });

  // =======================================================================
  // createSongHandler
  // =======================================================================
  describe('createSongHandler', () => {
    it('creates song with valid full input', async () => {
      const createdSong = { id: SONG_UUID, ...validSongInput };
      const qb = buildQueryBuilder(createdSong);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await createSongHandler(supabase, user, profileMapped, validSongInput);

      expect(result.status).toBe(201);
      expect(result.song).toEqual(createdSong);
      expect(qb.insert).toHaveBeenCalled();
    });

    it('creates draft with title only', async () => {
      const draftInput = { title: 'Quick idea', is_draft: true as const };
      const draftSong = { id: SONG_UUID, title: 'Quick idea', is_draft: true };
      const qb = buildQueryBuilder(draftSong);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await createSongHandler(supabase, user, profileMapped, draftInput);

      expect(result.status).toBe(201);
      expect(result.song).toEqual(draftSong);
    });

    it('returns 401 when user is null', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);

      const result = await createSongHandler(supabase, null, null, validSongInput);

      expect(result).toEqual({ error: 'Unauthorized', status: 401 });
    });

    it('returns 403 when profile is student', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('student');

      const result = await createSongHandler(supabase, user, profileMapped, validSongInput);

      expect(result.status).toBe(403);
      expect(result.error).toContain('Forbidden');
    });

    it('returns 422 for missing required fields (title)', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await createSongHandler(supabase, user, profileMapped, {
        author: 'Someone',
        level: 'beginner',
        key: 'C',
      });

      expect(result.status).toBe(422);
      expect(result.error).toContain('Validation failed');
    });

    it('returns 422 for invalid URL format in youtube_url', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await createSongHandler(supabase, user, profileMapped, {
        ...validSongInput,
        youtube_url: 'not-a-url',
      });

      expect(result.status).toBe(422);
      expect(result.error).toContain('Validation failed');
    });

    it('returns 409 for duplicate song (Supabase error code 23505)', async () => {
      const qb = buildQueryBuilder(null, { code: '23505', message: 'duplicate key' });
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await createSongHandler(supabase, user, profileMapped, validSongInput);

      expect(result.status).toBe(409);
      expect(result.error).toContain('already exists');
    });

    it('allows admin to create songs', async () => {
      const createdSong = { id: SONG_UUID, ...validSongInput };
      const qb = buildQueryBuilder(createdSong);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('admin');

      const result = await createSongHandler(supabase, user, profileMapped, validSongInput);

      expect(result.status).toBe(201);
    });
  });

  // =======================================================================
  // updateSongHandler
  // =======================================================================
  describe('updateSongHandler', () => {
    const fullUpdateInput = {
      ...validSongInput,
      title: 'Wonderwall (Acoustic)',
    };

    it('updates song with valid changes', async () => {
      const updatedSong = { id: SONG_UUID, ...fullUpdateInput };
      const qb = buildQueryBuilder(updatedSong);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await updateSongHandler(
        supabase, user, profileMapped, SONG_UUID, fullUpdateInput
      );

      expect(result.status).toBe(200);
      expect(result.song).toEqual(updatedSong);
      expect(qb.update).toHaveBeenCalled();
      expect(qb.eq).toHaveBeenCalledWith('id', SONG_UUID);
    });

    it('returns 401 when user is null', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);

      const result = await updateSongHandler(supabase, null, null, SONG_UUID, fullUpdateInput);

      expect(result).toEqual({ error: 'Unauthorized', status: 401 });
    });

    it('returns 403 when profile is student', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('student');

      const result = await updateSongHandler(
        supabase, user, profileMapped, SONG_UUID, fullUpdateInput
      );

      expect(result.status).toBe(403);
      expect(result.error).toContain('Forbidden');
    });

    it('returns 422 for invalid data', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await updateSongHandler(
        supabase, user, profileMapped, SONG_UUID, { title: '' }
      );

      expect(result.status).toBe(422);
      expect(result.error).toContain('Validation failed');
    });

    it('sets updated_at timestamp on update', async () => {
      const qb = buildQueryBuilder({ id: SONG_UUID });
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      await updateSongHandler(supabase, user, profileMapped, SONG_UUID, fullUpdateInput);

      const updatePayload = qb.update.mock.calls[0][0];
      expect(updatePayload).toHaveProperty('updated_at');
      expect(typeof updatePayload.updated_at).toBe('string');
    });

    it('updates draft to published (is_draft: false with full fields)', async () => {
      const publishInput = { ...validSongInput, is_draft: false };
      const publishedSong = { id: SONG_UUID, ...publishInput };
      const qb = buildQueryBuilder(publishedSong);
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await updateSongHandler(
        supabase, user, profileMapped, SONG_UUID, publishInput
      );

      // is_draft is false (not true), so SongInputSchema is used → requires all fields
      expect(result.status).toBe(200);
    });

    it('handles database error on update', async () => {
      const qb = buildQueryBuilder(null, { message: 'DB connection lost' });
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await updateSongHandler(
        supabase, user, profileMapped, SONG_UUID, fullUpdateInput
      );

      expect(result.status).toBe(500);
      expect(result.error).toBe('DB connection lost');
    });
  });

  // =======================================================================
  // deleteSongHandler
  // =======================================================================
  describe('deleteSongHandler', () => {
    it('soft-deletes song via RPC with cascade info', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      supabase.rpc.mockResolvedValue({
        data: {
          success: true,
          lesson_assignments_removed: 2,
          favorite_assignments_removed: 1,
        },
        error: null,
      });
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await deleteSongHandler(supabase, user, profileMapped, SONG_UUID);

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.cascadeInfo).toEqual({
        lessonSongsDeleted: 2,
        userFavoritesDeleted: 1,
      });
    });

    it('passes correct song_uuid and user_uuid to RPC', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      supabase.rpc.mockResolvedValue({
        data: { success: true, lesson_assignments_removed: 0, favorite_assignments_removed: 0 },
        error: null,
      });
      const { user, profileMapped } = createMockAuthContext('teacher');

      await deleteSongHandler(supabase, user, profileMapped, SONG_UUID);

      expect(supabase.rpc).toHaveBeenCalledWith('soft_delete_song_with_cascade', {
        song_uuid: SONG_UUID,
        user_uuid: user.id,
      });
    });

    it('returns 401 when user is null', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);

      const result = await deleteSongHandler(supabase, null, null, SONG_UUID);

      expect(result).toEqual({ error: 'Unauthorized', status: 401 });
    });

    it('returns 403 when profile is student', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      const { user, profileMapped } = createMockAuthContext('student');

      const result = await deleteSongHandler(supabase, user, profileMapped, SONG_UUID);

      expect(result.status).toBe(403);
      expect(result.error).toContain('Forbidden');
    });

    it('returns error when RPC fails', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Song not found' },
      });
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await deleteSongHandler(supabase, user, profileMapped, SONG_UUID);

      expect(result.status).toBe(500);
      expect(result.error).toBe('Song not found');
    });

    it('returns 400 when RPC returns success: false', async () => {
      const qb = buildQueryBuilder();
      const supabase = buildMockSupabase(qb);
      supabase.rpc.mockResolvedValue({
        data: { success: false, error: 'Song does not exist' },
        error: null,
      });
      const { user, profileMapped } = createMockAuthContext('teacher');

      const result = await deleteSongHandler(supabase, user, profileMapped, SONG_UUID);

      expect(result.status).toBe(400);
      expect(result.error).toBe('Song does not exist');
    });
  });

  // =======================================================================
  // validateMutationPermission
  // =======================================================================
  describe('validateMutationPermission', () => {
    it('returns true for admin', () => {
      expect(validateMutationPermission({ isAdmin: true })).toBe(true);
    });

    it('returns true for teacher', () => {
      expect(validateMutationPermission({ isTeacher: true })).toBe(true);
    });

    it('returns false for student (no isAdmin/isTeacher)', () => {
      expect(validateMutationPermission({ isAdmin: false, isTeacher: false })).toBe(false);
    });

    it('returns false for null profile', () => {
      expect(validateMutationPermission(null)).toBe(false);
    });
  });
});
