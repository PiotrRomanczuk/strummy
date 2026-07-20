/**
 * Song Detail Queries Tests
 *
 * Covers the read-side queries behind the song detail page:
 *   - getSongUsageStats — repertoire/lesson/created-at aggregate
 *   - getSongLearners   — students practicing the song (profile join)
 *   - getRelatedSongs   — same-level sibling songs
 *
 * @see lib/services/song-detail-queries.ts
 */

import { getSongUsageStats, getSongLearners, getRelatedSongs } from '../song-detail-queries';

const mockWarn = jest.fn();
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockWarn(...args),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

type SupabaseError = { message: string; code: string } | null;
type QueryResult = { data?: unknown; error: SupabaseError; count?: number | null };

const mockRepertoire = jest.fn();
const mockLessonCount = jest.fn();
const mockSongCreatedAt = jest.fn();
const mockLearners = jest.fn();
const mockRelated = jest.fn();
const mockLearnersLimit = jest.fn();
const mockRelatedLimit = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: (table: string) => {
        mockFrom(table);
        if (table === 'student_repertoire') {
          return {
            select: () => ({
              eq: () => ({
                // usage stats awaits directly after .eq('song_id', …)
                then: (resolve: (result: QueryResult) => void) =>
                  resolve(mockRepertoire() as QueryResult),
                // learners continue: .neq().order().limit()
                neq: () => ({
                  order: () => ({
                    limit: (n: number) => {
                      mockLearnersLimit(n);
                      return Promise.resolve(mockLearners() as QueryResult);
                    },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'lesson_songs') {
          return {
            select: () => ({
              eq: () => Promise.resolve(mockLessonCount() as QueryResult),
            }),
          };
        }
        // 'songs'
        return {
          select: () => ({
            eq: () => ({
              // usage stats: .eq('id', …).single()
              single: () => Promise.resolve(mockSongCreatedAt() as QueryResult),
              // related songs: .eq('level', …).is().neq().order().limit()
              is: () => ({
                neq: () => ({
                  order: () => ({
                    limit: (n: number) => {
                      mockRelatedLimit(n);
                      return Promise.resolve(mockRelated() as QueryResult);
                    },
                  }),
                }),
              }),
            }),
          }),
        };
      },
    })
  ),
}));

const SONG_ID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => {
  jest.clearAllMocks();
  mockRepertoire.mockReturnValue({ data: [], error: null });
  mockLessonCount.mockReturnValue({ count: 0, error: null });
  mockSongCreatedAt.mockReturnValue({ data: null, error: null });
  mockLearners.mockReturnValue({ data: [], error: null });
  mockRelated.mockReturnValue({ data: [], error: null });
});

describe('getSongUsageStats', () => {
  it('aggregates repertoire, lesson count, and created_at', async () => {
    mockRepertoire.mockReturnValue({
      data: [
        { current_status: 'mastered' },
        { current_status: 'started' },
        { current_status: 'to_learn' },
        { current_status: 'remembered' },
      ],
      error: null,
    });
    mockLessonCount.mockReturnValue({ count: 7, error: null });
    mockSongCreatedAt.mockReturnValue({
      data: { created_at: '2026-01-15T10:00:00.000Z' },
      error: null,
    });

    const stats = await getSongUsageStats(SONG_ID);

    // (100 + 25 + 0 + 50) / 4 = 43.75 → 44
    expect(stats).toEqual({
      assignedTo: 4,
      usedInLessons: 7,
      inLibrarySince: '2026-01-15T10:00:00.000Z',
      avgMastery: 44,
    });
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('logs warnings and falls back to zeros when queries fail', async () => {
    mockRepertoire.mockReturnValue({
      data: null,
      error: { message: 'repertoire boom', code: '42501' },
    });
    mockLessonCount.mockReturnValue({
      count: null,
      error: { message: 'lessons boom', code: '42501' },
    });
    mockSongCreatedAt.mockReturnValue({
      data: null,
      error: { message: 'song boom', code: 'PGRST116' },
    });

    const stats = await getSongUsageStats(SONG_ID);

    expect(stats).toEqual({
      assignedTo: 0,
      usedInLessons: 0,
      inLibrarySince: null,
      avgMastery: 0,
    });
    expect(mockWarn).toHaveBeenCalledWith('[song-detail-queries] usage stats — repertoire error', {
      error: 'repertoire boom',
      code: '42501',
    });
    expect(mockWarn).toHaveBeenCalledWith('[song-detail-queries] usage stats — lessons error', {
      error: 'lessons boom',
      code: '42501',
    });
  });

  it('returns avgMastery 0 for an empty repertoire without warning', async () => {
    mockRepertoire.mockReturnValue({ data: [], error: null });
    mockLessonCount.mockReturnValue({ count: 3, error: null });

    const stats = await getSongUsageStats(SONG_ID);

    expect(stats.assignedTo).toBe(0);
    expect(stats.avgMastery).toBe(0);
    expect(stats.usedInLessons).toBe(3);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});

describe('getSongLearners', () => {
  it('maps rows with array joins, object joins, and missing profiles', async () => {
    mockLearners.mockReturnValue({
      data: [
        {
          student_id: 'student-1',
          current_status: 'mastered',
          total_practice_minutes: 120,
          last_practiced_at: '2026-07-01T00:00:00.000Z',
          profiles: [{ full_name: 'Ala Kowalska', email: 'ala@example.com' }],
        },
        {
          student_id: 'student-2',
          current_status: 'started',
          total_practice_minutes: null,
          last_practiced_at: null,
          profiles: { full_name: null, email: null },
        },
        {
          student_id: 'student-3',
          current_status: 'remembered',
          total_practice_minutes: 15,
          last_practiced_at: null,
          profiles: [],
        },
      ],
      error: null,
    });

    const learners = await getSongLearners(SONG_ID);

    expect(mockLearnersLimit).toHaveBeenCalledWith(8);
    expect(learners).toEqual([
      {
        studentId: 'student-1',
        fullName: 'Ala Kowalska',
        email: 'ala@example.com',
        status: 'mastered',
        totalPracticeMinutes: 120,
        lastPracticedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        studentId: 'student-2',
        fullName: null,
        email: null,
        status: 'started',
        totalPracticeMinutes: 0,
        lastPracticedAt: null,
      },
      {
        studentId: 'student-3',
        fullName: null,
        email: null,
        status: 'remembered',
        totalPracticeMinutes: 15,
        lastPracticedAt: null,
      },
    ]);
  });

  it('passes an explicit limit through to the query', async () => {
    await getSongLearners(SONG_ID, 3);

    expect(mockLearnersLimit).toHaveBeenCalledWith(3);
  });

  it('logs a warning and returns [] on query error', async () => {
    mockLearners.mockReturnValue({
      data: null,
      error: { message: 'learners boom', code: '42501' },
    });

    const learners = await getSongLearners(SONG_ID);

    expect(learners).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith('[song-detail-queries] learners error', {
      error: 'learners boom',
      code: '42501',
    });
  });

  it('returns [] when data is null without error', async () => {
    mockLearners.mockReturnValue({ data: null, error: null });

    await expect(getSongLearners(SONG_ID)).resolves.toEqual([]);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});

describe('getRelatedSongs', () => {
  it('returns [] immediately when level is null', async () => {
    const related = await getRelatedSongs(SONG_ID, null);

    expect(related).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('maps related rows including null author/key', async () => {
    mockRelated.mockReturnValue({
      data: [
        { id: 'song-1', title: 'Wonderwall', author: 'Oasis', key: 'Am' },
        { id: 'song-2', title: 'Untitled', author: null, key: null },
      ],
      error: null,
    });

    const related = await getRelatedSongs(SONG_ID, 'beginner');

    expect(mockRelatedLimit).toHaveBeenCalledWith(3);
    expect(related).toEqual([
      { id: 'song-1', title: 'Wonderwall', author: 'Oasis', songKey: 'Am' },
      { id: 'song-2', title: 'Untitled', author: null, songKey: null },
    ]);
  });

  it('passes an explicit limit through to the query', async () => {
    await getRelatedSongs(SONG_ID, 'advanced', 5);

    expect(mockRelatedLimit).toHaveBeenCalledWith(5);
  });

  it('logs a warning and returns [] on query error', async () => {
    mockRelated.mockReturnValue({
      data: null,
      error: { message: 'related boom', code: '42501' },
    });

    const related = await getRelatedSongs(SONG_ID, 'beginner');

    expect(related).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith('[song-detail-queries] related error', {
      error: 'related boom',
      code: '42501',
    });
  });

  it('returns [] when data is null without error', async () => {
    mockRelated.mockReturnValue({ data: null, error: null });

    await expect(getRelatedSongs(SONG_ID, 'beginner')).resolves.toEqual([]);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});
