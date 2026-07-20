/**
 * Songs List Queries Tests
 *
 * Covers the editorial songs-list service:
 *   - getSongsForList — handler delegation, sort mapping, paging, breakdown
 *
 * @see lib/services/songs-list-queries.ts
 */

import { getSongsForList, SONGS_PAGE_SIZE, type SongsListFilters } from '../songs-list-queries';

const mockGetSongsHandler = jest.fn();
jest.mock('@/app/api/song/handlers', () => ({
  getSongsHandler: (...args: unknown[]) => mockGetSongsHandler(...args),
}));

type BreakdownResult = { data: unknown; error: { message: string } | null };

type BreakdownQuery = {
  eq: (field: string, value: string) => BreakdownQuery;
  ilike: (field: string, value: string) => BreakdownQuery;
  then: (resolve: (result: BreakdownResult) => void) => void;
};

const mockBreakdownResult = jest.fn();
const mockBreakdownEq = jest.fn();
const mockBreakdownIlike = jest.fn();

function mockMakeBreakdownQuery(): BreakdownQuery {
  const query: BreakdownQuery = {
    eq: (field, value) => {
      mockBreakdownEq(field, value);
      return query;
    },
    ilike: (field, value) => {
      mockBreakdownIlike(field, value);
      return query;
    },
    then: (resolve) => resolve(mockBreakdownResult() as BreakdownResult),
  };
  return query;
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          is: () => mockMakeBreakdownQuery(),
        }),
      }),
    })
  ),
}));

const user = { id: 'user-1' };
const teacherRoles = { isAdmin: false, isTeacher: true, isStudent: false };

const baseFilters: SongsListFilters = { sort: 'newest', page: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  mockBreakdownResult.mockReturnValue({ data: [], error: null });
  mockGetSongsHandler.mockResolvedValue({ songs: [], count: 0 });
});

describe('getSongsForList', () => {
  it('returns songs, totals, and a level breakdown (newest sort)', async () => {
    const songs = [{ id: 'song-1' }, { id: 'song-2' }];
    mockGetSongsHandler.mockResolvedValue({ songs, count: 120 });
    mockBreakdownResult.mockReturnValue({
      data: [
        { level: 'beginner' },
        { level: 'beginner' },
        { level: 'intermediate' },
        { level: 'advanced' },
        { level: null },
        { level: 'expert' }, // unknown level → unset
      ],
      error: null,
    });

    const result = await getSongsForList(user, teacherRoles, {
      ...baseFilters,
      page: 2,
    });

    expect(result.songs).toEqual(songs);
    expect(result.total).toBe(120);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(Math.ceil(120 / SONGS_PAGE_SIZE));
    expect(result.breakdown).toEqual({
      beginner: 2,
      intermediate: 1,
      advanced: 1,
      unset: 2,
    });
    expect(mockGetSongsHandler).toHaveBeenCalledWith(
      expect.anything(),
      user,
      { isAdmin: false, isTeacher: true },
      expect.objectContaining({
        sortBy: 'created_at',
        sortOrder: 'desc',
        page: 2,
        limit: SONGS_PAGE_SIZE,
        search: undefined,
      })
    );
    // no key/author/search filters → breakdown query untouched
    expect(mockBreakdownEq).not.toHaveBeenCalled();
    expect(mockBreakdownIlike).not.toHaveBeenCalled();
  });

  it('maps sort=title to title asc', async () => {
    await getSongsForList(user, teacherRoles, { ...baseFilters, sort: 'title' });

    expect(mockGetSongsHandler).toHaveBeenCalledWith(
      expect.anything(),
      user,
      expect.anything(),
      expect.objectContaining({ sortBy: 'title', sortOrder: 'asc' })
    );
  });

  it('maps sort=oldest to created_at asc', async () => {
    await getSongsForList(user, teacherRoles, { ...baseFilters, sort: 'oldest' });

    expect(mockGetSongsHandler).toHaveBeenCalledWith(
      expect.anything(),
      user,
      expect.anything(),
      expect.objectContaining({ sortBy: 'created_at', sortOrder: 'asc' })
    );
  });

  it('clamps page 0 to 1', async () => {
    const result = await getSongsForList(user, teacherRoles, {
      ...baseFilters,
      page: 0,
    });

    expect(result.page).toBe(1);
    expect(mockGetSongsHandler).toHaveBeenCalledWith(
      expect.anything(),
      user,
      expect.anything(),
      expect.objectContaining({ page: 1 })
    );
  });

  it('applies key/author/search filters to the breakdown query and trims search', async () => {
    await getSongsForList(
      user,
      { isAdmin: true, isTeacher: false, isStudent: false },
      {
        ...baseFilters,
        level: 'beginner',
        key: 'Am',
        author: 'Oasis',
        search: '  wonder  ',
      }
    );

    expect(mockBreakdownEq).toHaveBeenCalledWith('key', 'Am');
    expect(mockBreakdownEq).toHaveBeenCalledWith('author', 'Oasis');
    expect(mockBreakdownIlike).toHaveBeenCalledWith('title', '%wonder%');
    expect(mockGetSongsHandler).toHaveBeenCalledWith(
      expect.anything(),
      user,
      { isAdmin: true, isTeacher: false },
      expect.objectContaining({
        level: 'beginner',
        key: 'Am',
        author: 'Oasis',
        search: 'wonder',
      })
    );
  });

  it('treats whitespace-only search as no search', async () => {
    await getSongsForList(user, teacherRoles, { ...baseFilters, search: '   ' });

    expect(mockBreakdownIlike).not.toHaveBeenCalled();
    expect(mockGetSongsHandler).toHaveBeenCalledWith(
      expect.anything(),
      user,
      expect.anything(),
      expect.objectContaining({ search: undefined })
    );
  });

  it('falls back to songs.length when the handler returns no count', async () => {
    mockGetSongsHandler.mockResolvedValue({ songs: [{ id: 'song-1' }] });

    const result = await getSongsForList(user, teacherRoles, baseFilters);

    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('returns totalPages 1 for an empty result set', async () => {
    mockGetSongsHandler.mockResolvedValue({ songs: [] });

    const result = await getSongsForList(user, teacherRoles, baseFilters);

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  it('counts null breakdown data as all zeros', async () => {
    mockBreakdownResult.mockReturnValue({ data: null, error: null });

    const result = await getSongsForList(user, teacherRoles, baseFilters);

    expect(result.breakdown).toEqual({
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      unset: 0,
    });
  });

  it('throws when the songs handler returns an error', async () => {
    mockGetSongsHandler.mockResolvedValue({ error: 'Unauthorized', status: 401 });

    await expect(getSongsForList(user, teacherRoles, baseFilters)).rejects.toThrow(
      'songs list query failed: Unauthorized'
    );
  });

  it('throws when the breakdown query fails', async () => {
    mockBreakdownResult.mockReturnValue({
      data: null,
      error: { message: 'permission denied' },
    });

    await expect(getSongsForList(user, teacherRoles, baseFilters)).rejects.toThrow(
      'songs breakdown query failed: permission denied'
    );
  });
});
