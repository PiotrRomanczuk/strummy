/**
 * Song of the Week Server Actions - Integration Tests
 *
 * Tests all 5 exported server actions:
 * - getCurrentSongOfTheWeek
 * - setSongOfTheWeek
 * - deactivateSongOfTheWeek
 * - addSotwToRepertoire
 * - searchSongsForSotw
 *
 * @see app/actions/song-of-the-week.ts
 */

import {
  getCurrentSongOfTheWeek,
  setSongOfTheWeek,
  deactivateSongOfTheWeek,
  addSotwToRepertoire,
  searchSongsForSotw,
} from '../song-of-the-week';
import { createMockQueryBuilder } from '@/lib/testing/integration-helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUserWithRolesSSR = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => mockGetUserWithRolesSSR(),
}));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ from: mockFrom })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockAddSongToRepertoireAction = jest.fn();
jest.mock('@/app/actions/repertoire', () => ({
  addSongToRepertoireAction: (...args: unknown[]) => mockAddSongToRepertoireAction(...args),
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const ADMIN_USER = { id: 'admin-uuid-001', email: 'admin@test.com' };
const STUDENT_USER = { id: 'student-uuid-002', email: 'student@test.com' };
const TEACHER_USER = { id: 'teacher-uuid-003', email: 'teacher@test.com' };

const VALID_SONG_ID = '550e8400-e29b-41d4-a716-446655440000';

const MOCK_SONG = {
  id: VALID_SONG_ID,
  title: 'Wonderwall',
  author: 'Oasis',
  level: 'beginner',
  key: 'Em',
  chords: 'Em G D A',
  youtube_url: null,
  spotify_link_url: null,
  ultimate_guitar_link: null,
  cover_image_url: null,
  strumming_pattern: null,
  tempo: null,
  capo_fret: null,
};

const MOCK_SOTW = {
  id: 'sotw-uuid-100',
  song_id: VALID_SONG_ID,
  selected_by: ADMIN_USER.id,
  teacher_message: 'Practice this one!',
  active_from: '2026-02-24T00:00:00Z',
  active_until: '2026-03-03',
  is_active: true,
  created_at: '2026-02-24T00:00:00Z',
  updated_at: '2026-02-24T00:00:00Z',
  song: MOCK_SONG,
};

// Helper: configure mock auth context
function mockAuth(
  user: typeof ADMIN_USER | null,
  roles: { isAdmin?: boolean; isTeacher?: boolean; isStudent?: boolean } = {}
) {
  mockGetUserWithRolesSSR.mockResolvedValue({
    user,
    profileId: user?.id,
    isAdmin: roles.isAdmin ?? false,
    isTeacher: roles.isTeacher ?? false,
    isStudent: roles.isStudent ?? false,
    isDevelopment: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getCurrentSongOfTheWeek
// ---------------------------------------------------------------------------
describe('getCurrentSongOfTheWeek', () => {
  it('should return null when user is not authenticated', async () => {
    mockAuth(null);

    const result = await getCurrentSongOfTheWeek();
    expect(result).toBeNull();
  });

  it('should return SOTW with joined song data on success', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });
    const qb = createMockQueryBuilder(MOCK_SOTW);
    mockFrom.mockReturnValue(qb);

    const result = await getCurrentSongOfTheWeek();

    expect(mockFrom).toHaveBeenCalledWith('song_of_the_week');
    expect(qb.eq).toHaveBeenCalledWith('is_active', true);
    expect(result).toMatchObject({
      id: MOCK_SOTW.id,
      song_id: VALID_SONG_ID,
      song: MOCK_SONG,
    });
  });

  it('should return null when no active SOTW exists', async () => {
    mockAuth(STUDENT_USER, { isStudent: true });
    const qb = createMockQueryBuilder(null);
    mockFrom.mockReturnValue(qb);

    const result = await getCurrentSongOfTheWeek();
    expect(result).toBeNull();
  });

  it('should return null on database error', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });
    const qb = createMockQueryBuilder(null, { message: 'connection lost' });
    mockFrom.mockReturnValue(qb);

    const result = await getCurrentSongOfTheWeek();
    expect(result).toBeNull();
  });

  it('should normalize song array to single object', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });
    const sotwWithArray = { ...MOCK_SOTW, song: [MOCK_SONG] };
    const qb = createMockQueryBuilder(sotwWithArray);
    mockFrom.mockReturnValue(qb);

    const result = await getCurrentSongOfTheWeek();
    expect(result?.song).toEqual(MOCK_SONG);
    expect(Array.isArray(result?.song)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setSongOfTheWeek
// ---------------------------------------------------------------------------
describe('setSongOfTheWeek', () => {
  const validInput = {
    song_id: VALID_SONG_ID,
    teacher_message: 'Learn this one!',
    active_until: '2026-03-10',
  };

  it('should return error when user is not authenticated', async () => {
    mockAuth(null);

    const result = await setSongOfTheWeek(validInput);
    expect(result).toEqual({
      error: 'Unauthorized \u2014 admin access required',
    });
  });

  it('should return error when user is not admin', async () => {
    mockAuth(STUDENT_USER, { isStudent: true });

    const result = await setSongOfTheWeek(validInput);
    expect(result).toEqual({
      error: 'Unauthorized \u2014 admin access required',
    });
  });

  it('should return error for teacher without admin role', async () => {
    mockAuth(TEACHER_USER, { isTeacher: true });

    const result = await setSongOfTheWeek(validInput);
    expect(result).toEqual({
      error: 'Unauthorized \u2014 admin access required',
    });
  });

  it('should return validation error for missing song_id', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const result = await setSongOfTheWeek({});
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toBeTruthy();
  });

  it('should return validation error for invalid song_id format', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const result = await setSongOfTheWeek({ song_id: 'not-a-uuid' });
    expect(result).toHaveProperty('error');
  });

  it('should return validation error for too-long teacher_message', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const result = await setSongOfTheWeek({
      song_id: VALID_SONG_ID,
      teacher_message: 'x'.repeat(501),
    });
    expect(result).toEqual({
      error: 'Message must be 500 characters or less',
    });
  });

  it('should return validation error for invalid date format', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const result = await setSongOfTheWeek({
      song_id: VALID_SONG_ID,
      active_until: '03/10/2026',
    });
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('date');
  });

  it('should deactivate current and insert new SOTW on success', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    // First call: deactivate (update), second call: insert
    const deactivateQb = createMockQueryBuilder(null);
    const insertQb = createMockQueryBuilder(null);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? deactivateQb : insertQb;
    });

    const result = await setSongOfTheWeek(validInput);

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith('song_of_the_week');
    expect(deactivateQb.update).toHaveBeenCalledWith({ is_active: false });
    expect(deactivateQb.eq).toHaveBeenCalledWith('is_active', true);
    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        song_id: VALID_SONG_ID,
        selected_by: ADMIN_USER.id,
        teacher_message: 'Learn this one!',
        active_until: '2026-03-10',
      })
    );
  });

  it('should return error when deactivation fails', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const deactivateQb = createMockQueryBuilder(null, {
      message: 'DB error on update',
    });
    mockFrom.mockReturnValue(deactivateQb);

    const result = await setSongOfTheWeek(validInput);
    expect(result).toEqual({ error: 'Failed to update song of the week' });
  });

  it('should return error when insert fails', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const deactivateQb = createMockQueryBuilder(null);
    const insertQb = createMockQueryBuilder(null, {
      message: 'DB error on insert',
    });
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? deactivateQb : insertQb;
    });

    const result = await setSongOfTheWeek(validInput);
    expect(result).toEqual({ error: 'Failed to set song of the week' });
  });
});

// ---------------------------------------------------------------------------
// deactivateSongOfTheWeek
// ---------------------------------------------------------------------------
describe('deactivateSongOfTheWeek', () => {
  const sotwId = 'sotw-uuid-100';

  it('should return error when user is not authenticated', async () => {
    mockAuth(null);

    const result = await deactivateSongOfTheWeek(sotwId);
    expect(result).toEqual({
      error: 'Unauthorized \u2014 admin access required',
    });
  });

  it('should return error when user is not admin', async () => {
    mockAuth(STUDENT_USER, { isStudent: true });

    const result = await deactivateSongOfTheWeek(sotwId);
    expect(result).toEqual({
      error: 'Unauthorized \u2014 admin access required',
    });
  });

  it('should deactivate SOTW by id on success', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const qb = createMockQueryBuilder(null);
    mockFrom.mockReturnValue(qb);

    const result = await deactivateSongOfTheWeek(sotwId);

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith('song_of_the_week');
    expect(qb.update).toHaveBeenCalledWith({ is_active: false });
    expect(qb.eq).toHaveBeenCalledWith('id', sotwId);
  });

  it('should return error on database failure', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const qb = createMockQueryBuilder(null, { message: 'DB error' });
    mockFrom.mockReturnValue(qb);

    const result = await deactivateSongOfTheWeek(sotwId);
    expect(result).toEqual({ error: 'Failed to remove song of the week' });
  });
});

// ---------------------------------------------------------------------------
// addSotwToRepertoire
// ---------------------------------------------------------------------------
describe('addSotwToRepertoire', () => {
  it('should return error when user is not authenticated', async () => {
    mockAuth(null);

    const result = await addSotwToRepertoire();
    expect(result).toEqual({
      error: 'Unauthorized \u2014 student access required',
    });
  });

  it('should return error when user is not a student', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const result = await addSotwToRepertoire();
    expect(result).toEqual({
      error: 'Unauthorized \u2014 student access required',
    });
  });

  it('should return error when no active SOTW exists', async () => {
    // First call: addSotwToRepertoire checks isStudent
    // Second call (internal getCurrentSongOfTheWeek): checks user
    // The function calls getCurrentSongOfTheWeek internally, which calls
    // getUserWithRolesSSR again. We need to handle both calls.
    mockGetUserWithRolesSSR
      .mockResolvedValueOnce({
        user: STUDENT_USER,
        profileId: STUDENT_USER.id,
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
      })
      .mockResolvedValueOnce({
        user: STUDENT_USER,
        profileId: STUDENT_USER.id,
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        isDevelopment: false,
      });

    const qb = createMockQueryBuilder(null);
    mockFrom.mockReturnValue(qb);

    const result = await addSotwToRepertoire();
    expect(result).toEqual({
      error: 'No song of the week is currently active',
    });
  });

  it('should add SOTW to student repertoire on success', async () => {
    // Two getUserWithRolesSSR calls: addSotwToRepertoire + getCurrentSongOfTheWeek
    mockGetUserWithRolesSSR
      .mockResolvedValueOnce({
        user: STUDENT_USER,
        profileId: STUDENT_USER.id,
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
      })
      .mockResolvedValueOnce({
        user: STUDENT_USER,
        profileId: STUDENT_USER.id,
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        isDevelopment: false,
      });

    const qb = createMockQueryBuilder(MOCK_SOTW);
    mockFrom.mockReturnValue(qb);

    mockAddSongToRepertoireAction.mockResolvedValue({
      success: true,
      id: 'repertoire-uuid-999',
    });

    const result = await addSotwToRepertoire();

    expect(result).toEqual({ success: true, id: 'repertoire-uuid-999' });
    expect(mockAddSongToRepertoireAction).toHaveBeenCalledWith({
      student_id: STUDENT_USER.id,
      song_id: VALID_SONG_ID,
    });
  });

  it('should propagate error from addSongToRepertoireAction', async () => {
    mockGetUserWithRolesSSR
      .mockResolvedValueOnce({
        user: STUDENT_USER,
        profileId: STUDENT_USER.id,
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
      })
      .mockResolvedValueOnce({
        user: STUDENT_USER,
        profileId: STUDENT_USER.id,
        isAdmin: false,
        isTeacher: false,
        isStudent: true,
        isDevelopment: false,
      });

    const qb = createMockQueryBuilder(MOCK_SOTW);
    mockFrom.mockReturnValue(qb);

    mockAddSongToRepertoireAction.mockResolvedValue({
      error: 'Song already in repertoire',
    });

    const result = await addSotwToRepertoire();
    expect(result).toEqual({ error: 'Song already in repertoire' });
  });
});

// ---------------------------------------------------------------------------
// searchSongsForSotw
// ---------------------------------------------------------------------------
describe('searchSongsForSotw', () => {
  const mockSongs = [
    { id: 'song-1', title: 'Wonderwall', author: 'Oasis', level: 'beginner' },
    {
      id: 'song-2',
      title: 'Wish You Were Here',
      author: 'Pink Floyd',
      level: 'intermediate',
    },
  ];

  it('should return error when user is not authenticated', async () => {
    mockAuth(null);

    const result = await searchSongsForSotw('wonder');
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('should return error when user is not admin', async () => {
    mockAuth(STUDENT_USER, { isStudent: true });

    const result = await searchSongsForSotw('wonder');
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('should search songs by query and return results', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const qb = createMockQueryBuilder(mockSongs);
    mockFrom.mockReturnValue(qb);

    const result = await searchSongsForSotw('wonder');

    expect(mockFrom).toHaveBeenCalledWith('songs');
    expect(qb.select).toHaveBeenCalledWith('id, title, author, level');
    expect(qb.is).toHaveBeenCalledWith('deleted_at', null);
    expect(qb.order).toHaveBeenCalledWith('title', { ascending: true });
    expect(qb.limit).toHaveBeenCalledWith(20);
    expect(qb.or).toHaveBeenCalledWith('title.ilike.%wonder%,author.ilike.%wonder%');
    expect(result).toEqual({ songs: mockSongs });
  });

  it('should return empty array when no songs match', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const result = await searchSongsForSotw('zzzznonexistent');

    expect(result).toEqual({ songs: [] });
  });

  it('should handle empty query string without calling or()', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const qb = createMockQueryBuilder(mockSongs);
    mockFrom.mockReturnValue(qb);

    const result = await searchSongsForSotw('   ');

    expect(qb.or).not.toHaveBeenCalled();
    expect(result).toEqual({ songs: mockSongs });
  });

  it('should return error on database failure', async () => {
    mockAuth(ADMIN_USER, { isAdmin: true });

    const qb = createMockQueryBuilder(null, {
      message: 'relation "songs" does not exist',
    });
    mockFrom.mockReturnValue(qb);

    const result = await searchSongsForSotw('wonder');
    expect(result).toEqual({
      error: 'relation "songs" does not exist',
    });
  });
});
