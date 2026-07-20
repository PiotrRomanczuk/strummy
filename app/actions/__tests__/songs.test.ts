/**
 * Songs Server Actions Tests
 *
 * @see app/actions/songs.ts
 *
 * Covers updateLessonSongStatus, getExistingCategories (and the private
 * normalizeCategory it drives), quickAssignSongToLesson, checkSongDuplicate and
 * bulkSoftDeleteSongs. setSongRecordingState / cycleSongRecordingState have
 * their own suite in `song-recording.test.ts`.
 */

import {
  updateLessonSongStatus,
  getExistingCategories,
  quickAssignSongToLesson,
  checkSongDuplicate,
  bulkSoftDeleteSongs,
} from '../songs';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

const mockGetUserWithRolesSSR = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => mockGetUserWithRolesSSR(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// songs.ts imports the bare `logger` singleton, not createLogger.
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

/* ---------- Supabase stand-in ---------- */

type QueryResult = { data?: unknown; error?: unknown };

/** Per-table FIFO of results; each awaited query consumes one entry. */
let tableResults: Record<string, QueryResult[]>;
let rpcResults: QueryResult[];

const spy = {
  from: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  neq: jest.fn(),
  eq: jest.fn(),
  ilike: jest.fn(),
  rpc: jest.fn(),
};

function buildChain(table: string) {
  const take = (): QueryResult => tableResults[table]?.shift() ?? { data: null, error: null };
  const chain: Record<string, unknown> = {};

  for (const method of ['select', 'not', 'is', 'limit', 'order']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.eq = jest.fn((...args: unknown[]) => {
    spy.eq(...args);
    return chain;
  });
  chain.neq = jest.fn((...args: unknown[]) => {
    spy.neq(...args);
    return chain;
  });
  chain.ilike = jest.fn((...args: unknown[]) => {
    spy.ilike(...args);
    return chain;
  });
  chain.update = jest.fn((payload: unknown) => {
    spy.update(payload);
    return chain;
  });
  chain.upsert = jest.fn((payload: unknown, opts: unknown) => {
    spy.upsert(payload, opts);
    return chain;
  });
  chain.single = jest.fn(() => Promise.resolve(take()));
  chain.maybeSingle = jest.fn(() => Promise.resolve(take()));
  // Thenable so a chain without an explicit terminal can be awaited directly.
  chain.then = (resolve: (v: QueryResult) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(take()).then(resolve, reject);

  return chain;
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: (table: string) => {
        spy.from(table);
        return buildChain(table);
      },
      rpc: (name: string, args: unknown) => {
        spy.rpc(name, args);
        return Promise.resolve(rpcResults.shift() ?? { data: null, error: null });
      },
    })
  ),
}));

/* ---------- Fixtures ---------- */

const LESSON_SONG_ID = '550e8400-e29b-41d4-a716-446655440000';
const SONG_ID = '550e8400-e29b-41d4-a716-446655440001';
const SONG_ID_2 = '550e8400-e29b-41d4-a716-446655440002';
const LESSON_ID = '550e8400-e29b-41d4-a716-446655440003';
const USER_ID = '550e8400-e29b-41d4-a716-446655440009';

const asAdmin = { isAdmin: true, isTeacher: false, isDevelopment: false, user: { id: USER_ID } };
const asTeacher = { isAdmin: false, isTeacher: true, isDevelopment: false, user: { id: USER_ID } };
const asStudent = { isAdmin: false, isTeacher: false, isDevelopment: false, user: { id: USER_ID } };

beforeEach(() => {
  jest.clearAllMocks();
  tableResults = {};
  rpcResults = [];
  mockGetUserWithRolesSSR.mockResolvedValue(asAdmin);
});

describe('updateLessonSongStatus', () => {
  it.each(['to_learn', 'started', 'remembered', 'with_author', 'mastered'])(
    'accepts the %s status',
    async (status) => {
      await updateLessonSongStatus(LESSON_SONG_ID, status);

      expect(spy.from).toHaveBeenCalledWith('lesson_songs');
      expect(spy.update).toHaveBeenCalledWith({ status });
      expect(spy.eq).toHaveBeenCalledWith('id', LESSON_SONG_ID);
    }
  );

  it('allows a teacher', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asTeacher);

    await updateLessonSongStatus(LESSON_SONG_ID, 'started');

    expect(spy.update).toHaveBeenCalledWith({ status: 'started' });
  });

  it('throws for a non-teacher, non-admin', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asStudent);

    await expect(updateLessonSongStatus(LESSON_SONG_ID, 'mastered')).rejects.toThrow(
      'Unauthorized'
    );
    expect(spy.from).not.toHaveBeenCalled();
  });

  it('rejects an invalid status', async () => {
    await expect(updateLessonSongStatus(LESSON_SONG_ID, 'completed')).rejects.toThrow(
      'Invalid song status'
    );
    expect(spy.from).not.toHaveBeenCalled();
  });

  it('throws and logs when the update fails', async () => {
    tableResults.lesson_songs = [{ error: { message: 'Database error' } }];

    await expect(updateLessonSongStatus(LESSON_SONG_ID, 'mastered')).rejects.toThrow(
      'Failed to update status'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error updating lesson song status:',
      expect.anything()
    );
  });
});

describe('getExistingCategories', () => {
  it('normalizes to title case, counts usage and sorts by popularity', async () => {
    tableResults.songs = [
      {
        data: [
          { category: 'rock' },
          { category: 'ROCK' },
          { category: '  rock music  ' },
          { category: 'blues' },
          { category: 'Rock' },
        ],
      },
    ];

    expect(await getExistingCategories()).toEqual([
      { name: 'Rock', count: 3 },
      { name: 'Rock Music', count: 1 },
      { name: 'Blues', count: 1 },
    ]);
  });

  it('skips rows with a falsy category', async () => {
    tableResults.songs = [{ data: [{ category: null }, { category: '' }, { category: 'jazz' }] }];

    expect(await getExistingCategories()).toEqual([{ name: 'Jazz', count: 1 }]);
  });

  it('returns an empty list when the query yields no rows', async () => {
    tableResults.songs = [{ data: null }];

    expect(await getExistingCategories()).toEqual([]);
  });

  it('logs and returns an empty list on a query error', async () => {
    tableResults.songs = [{ data: null, error: { message: 'boom' } }];

    expect(await getExistingCategories()).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith('Error fetching categories:', expect.anything());
  });
});

describe('quickAssignSongToLesson', () => {
  const armLessonFound = () => {
    tableResults.lessons = [{ data: { id: LESSON_ID }, error: null }];
  };

  it('rejects a non-teacher, non-admin', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asStudent);

    expect(await quickAssignSongToLesson(SONG_ID, LESSON_ID)).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('rejects an invalid status', async () => {
    const result = await quickAssignSongToLesson(SONG_ID, LESSON_ID, 'nonsense');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid status: nonsense');
    expect(spy.from).not.toHaveBeenCalled();
  });

  it('returns not-found when the lesson lookup errors', async () => {
    tableResults.lessons = [{ data: null, error: { message: 'denied' } }];

    expect(await quickAssignSongToLesson(SONG_ID, LESSON_ID)).toEqual({
      success: false,
      error: 'Lesson not found or access denied',
    });
  });

  it('returns not-found when the lesson row is missing', async () => {
    tableResults.lessons = [{ data: null, error: null }];

    expect(await quickAssignSongToLesson(SONG_ID, LESSON_ID)).toEqual({
      success: false,
      error: 'Lesson not found or access denied',
    });
  });

  it('inserts a new assignment with the default status', async () => {
    armLessonFound();
    tableResults.lesson_songs = [{ data: null }, { error: null }];

    const result = await quickAssignSongToLesson(SONG_ID, LESSON_ID);

    expect(result).toEqual({ success: true, isUpdate: false });
    expect(spy.upsert).toHaveBeenCalledWith(
      { lesson_id: LESSON_ID, song_id: SONG_ID, status: 'to_learn' },
      { onConflict: 'lesson_id,song_id' }
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/lessons/${LESSON_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/songs');
  });

  it('flags an existing assignment as an update and honours an explicit status', async () => {
    armLessonFound();
    tableResults.lesson_songs = [{ data: { id: 'ls1' } }, { error: null }];

    const result = await quickAssignSongToLesson(SONG_ID, LESSON_ID, 'mastered');

    expect(result).toEqual({ success: true, isUpdate: true });
    expect(spy.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'mastered' }),
      expect.anything()
    );
  });

  it('logs and reports failure when the upsert errors', async () => {
    armLessonFound();
    tableResults.lesson_songs = [{ data: null }, { error: { message: 'conflict' } }];

    expect(await quickAssignSongToLesson(SONG_ID, LESSON_ID)).toEqual({
      success: false,
      error: 'Failed to assign song',
    });
    expect(logger.error).toHaveBeenCalledWith('Error assigning song to lesson:', expect.anything());
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('checkSongDuplicate', () => {
  it.each([
    ['a blank title', { title: '   ', author: 'Oasis' }],
    ['a blank author', { title: 'Wonderwall', author: '' }],
  ])('short-circuits on %s', async (_label, params) => {
    expect(await checkSongDuplicate(params)).toEqual({ exists: false });
    expect(spy.from).not.toHaveBeenCalled();
  });

  it('reports a duplicate and trims the inputs before matching', async () => {
    tableResults.songs = [{ data: [{ id: SONG_ID, title: 'Wonderwall', author: 'Oasis' }] }];

    expect(await checkSongDuplicate({ title: '  Wonderwall ', author: ' Oasis ' })).toEqual({
      exists: true,
      existingTitle: 'Wonderwall',
      existingAuthor: 'Oasis',
    });
    expect(spy.ilike).toHaveBeenCalledWith('title', 'Wonderwall');
    expect(spy.ilike).toHaveBeenCalledWith('author', 'Oasis');
    expect(spy.neq).not.toHaveBeenCalled();
  });

  it('excludes the song being edited', async () => {
    tableResults.songs = [{ data: [] }];

    expect(
      await checkSongDuplicate({ title: 'Wonderwall', author: 'Oasis', excludeId: SONG_ID })
    ).toEqual({ exists: false });
    expect(spy.neq).toHaveBeenCalledWith('id', SONG_ID);
  });

  it('reports no duplicate when the query returns nothing', async () => {
    tableResults.songs = [{ data: null }];

    expect(await checkSongDuplicate({ title: 'Wonderwall', author: 'Oasis' })).toEqual({
      exists: false,
    });
  });
});

describe('bulkSoftDeleteSongs', () => {
  it('rejects a non-teacher, non-admin', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asStudent);

    expect(await bulkSoftDeleteSongs([SONG_ID])).toEqual({
      success: false,
      deletedCount: 0,
      errors: ['Unauthorized'],
    });
  });

  it('rejects an unauthenticated caller', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({ ...asAdmin, user: null });

    expect(await bulkSoftDeleteSongs([SONG_ID])).toEqual({
      success: false,
      deletedCount: 0,
      errors: ['User not authenticated'],
    });
  });

  it('short-circuits on an empty id list', async () => {
    expect(await bulkSoftDeleteSongs([])).toEqual({
      success: true,
      deletedCount: 0,
      errors: [],
    });
    expect(spy.rpc).not.toHaveBeenCalled();
  });

  it('deletes every song via the cascade RPC', async () => {
    rpcResults = [{ data: { success: true } }, { data: { success: true } }];

    expect(await bulkSoftDeleteSongs([SONG_ID, SONG_ID_2])).toEqual({
      success: true,
      deletedCount: 2,
      errors: [],
    });
    expect(spy.rpc).toHaveBeenCalledWith('soft_delete_song_with_cascade', {
      song_uuid: SONG_ID,
      user_uuid: USER_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/songs');
  });

  it('collects per-song failures and keeps going', async () => {
    rpcResults = [
      { data: null, error: { message: 'rpc exploded' } },
      { data: { success: false, error: 'song is referenced' } },
      { data: { success: false } },
      { data: { success: true } },
    ];

    const result = await bulkSoftDeleteSongs([SONG_ID, SONG_ID_2, 'song-3', 'song-4']);

    expect(result.deletedCount).toBe(1);
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      `Failed to delete song ${SONG_ID}: rpc exploded`,
      'song is referenced',
      'Failed to delete song song-3',
    ]);
  });
});
