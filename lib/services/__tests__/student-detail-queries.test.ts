import {
  getStudentProfile,
  getStudentRepertoire,
  getStudentRecentLessons,
  totalPracticeMinutes,
  getStudentPreferences,
} from '../student-detail-queries';
import { logger } from '@/lib/logger';

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockIs = jest.fn();

// Results awaited straight off the builder (queries that end on .order() rather
// than .limit()). The real PostgREST builder is a thenable that resolves
// whenever it is awaited, regardless of which method was called last — mirror
// that here so a query without a trailing .limit() still resolves.
const mockChainResults: { data: unknown; error: unknown }[] = [];

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: jest.fn(() => {
        const chain = {
          select: mockSelect.mockImplementation(() => chain),
          eq: mockEq.mockImplementation(() => chain),
          is: mockIs.mockImplementation(() => chain),
          order: mockOrder.mockImplementation(() => chain),
          limit: mockLimit.mockImplementation(() => chain),
          single: mockSingle.mockImplementation(() => chain),
          maybeSingle: mockMaybeSingle.mockImplementation(() => chain),
          then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve(mockChainResults.shift() ?? { data: null, error: null }).then(
              resolve,
              reject
            ),
        };
        return chain;
      }),
    })
  ),
}));

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

describe('student-detail-queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChainResults.length = 0;
  });

  describe('getStudentProfile', () => {
    it('returns student profile', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 's1',
          full_name: 'Student Bob',
          email: 'bob@example.com',
          created_at: '2026-07-20T10:00:00Z',
          is_shadow: false,
          invite_email: null,
        },
        error: null,
      });

      const profile = await getStudentProfile('s1');
      expect(profile).toEqual({
        id: 's1',
        fullName: 'Student Bob',
        email: 'bob@example.com',
        createdAt: '2026-07-20T10:00:00Z',
        isShadow: false,
        inviteEmail: null,
      });
      expect(mockEq).toHaveBeenCalledWith('id', 's1');
    });

    it('returns null and logs on error (except PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'db err', code: 'ERR' } });
      expect(await getStudentProfile('s1')).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('[student-detail-queries] profile error', {
        error: 'db err',
        code: 'ERR',
      });
    });

    it('returns null silently on PGRST116', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found', code: 'PGRST116' },
      });
      expect(await getStudentProfile('s1')).toBeNull();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('falls back to null/false when every nullable column is null', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 's1',
          full_name: null,
          email: null,
          created_at: null,
          is_shadow: null,
          invite_email: null,
        },
        error: null,
      });

      expect(await getStudentProfile('s1')).toEqual({
        id: 's1',
        fullName: null,
        email: null,
        createdAt: null,
        isShadow: false,
        inviteEmail: null,
      });
    });
  });

  describe('getStudentRepertoire', () => {
    it('returns mapped repertoire', async () => {
      mockChainResults.push({
        data: [
          {
            id: 'r1',
            song_id: 'song1',
            current_status: 'started',
            total_practice_minutes: 120,
            last_practiced_at: '2026-07-20T10:00:00Z',
            songs: { title: 'Wonderwall', author: 'Oasis' },
          },
        ],
        error: null,
      });

      const repertoire = await getStudentRepertoire('s1');
      expect(repertoire).toEqual([
        {
          id: 'r1',
          songId: 'song1',
          songTitle: 'Wonderwall',
          songAuthor: 'Oasis',
          status: 'started',
          totalPracticeMinutes: 120,
          lastPracticedAt: '2026-07-20T10:00:00Z',
        },
      ]);
      expect(mockOrder).toHaveBeenCalledWith('last_practiced_at', {
        ascending: false,
        nullsFirst: false,
      });
    });

    it('returns empty array and logs on error', async () => {
      mockChainResults.push({ data: null, error: { message: 'db err', code: 'ERR' } });
      expect(await getStudentRepertoire('s1')).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('[student-detail-queries] repertoire error', {
        error: 'db err',
        code: 'ERR',
      });
    });

    it('unwraps the embedded song when the join returns an array', async () => {
      mockChainResults.push({
        data: [
          {
            id: 'r1',
            song_id: 'song1',
            current_status: 'started',
            total_practice_minutes: 30,
            last_practiced_at: '2026-07-20T10:00:00Z',
            songs: [{ title: 'Blackbird', author: 'The Beatles' }],
          },
        ],
        error: null,
      });

      expect(await getStudentRepertoire('s1')).toEqual([
        {
          id: 'r1',
          songId: 'song1',
          songTitle: 'Blackbird',
          songAuthor: 'The Beatles',
          status: 'started',
          totalPracticeMinutes: 30,
          lastPracticedAt: '2026-07-20T10:00:00Z',
        },
      ]);
    });

    it('falls back for a missing song join and null numeric/date columns', async () => {
      mockChainResults.push({
        data: [
          {
            id: 'r1',
            song_id: 'song1',
            current_status: 'to_learn',
            total_practice_minutes: null,
            last_practiced_at: null,
            songs: null,
          },
          {
            id: 'r2',
            song_id: 'song2',
            current_status: 'to_learn',
            total_practice_minutes: 5,
            last_practiced_at: null,
            songs: { title: null, author: null },
          },
        ],
        error: null,
      });

      expect(await getStudentRepertoire('s1')).toEqual([
        {
          id: 'r1',
          songId: 'song1',
          songTitle: 'Untitled',
          songAuthor: null,
          status: 'to_learn',
          totalPracticeMinutes: 0,
          lastPracticedAt: null,
        },
        {
          id: 'r2',
          songId: 'song2',
          songTitle: 'Untitled',
          songAuthor: null,
          status: 'to_learn',
          totalPracticeMinutes: 5,
          lastPracticedAt: null,
        },
      ]);
    });

    it('returns empty array when supabase resolves a null payload without error', async () => {
      mockChainResults.push({ data: null, error: null });
      expect(await getStudentRepertoire('s1')).toEqual([]);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('orders by last practice with a created_at tiebreaker and fetches every row', async () => {
      mockChainResults.push({ data: [], error: null });

      await getStudentRepertoire('s1');

      expect(mockOrder).toHaveBeenNthCalledWith(1, 'last_practiced_at', {
        ascending: false,
        nullsFirst: false,
      });
      expect(mockOrder).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false });
      // No limit argument means the caller wants the full repertoire (the
      // detail view's "Show all N songs" expander depends on it).
      expect(mockLimit).not.toHaveBeenCalled();
    });

    it('applies an explicit row cap when a limit is passed', async () => {
      mockLimit.mockResolvedValueOnce({ data: [], error: null });

      expect(await getStudentRepertoire('s1', 5)).toEqual([]);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });

  describe('getStudentRecentLessons', () => {
    it('returns mapped recent lessons', async () => {
      mockLimit.mockResolvedValueOnce({
        data: [
          {
            id: 'l1',
            scheduled_at: '2026-07-20T10:00:00Z',
            status: 'scheduled',
            title: 'Lesson 1',
          },
        ],
        error: null,
      });

      const lessons = await getStudentRecentLessons('s1');
      expect(lessons).toEqual([
        { id: 'l1', scheduledAt: '2026-07-20T10:00:00Z', status: 'scheduled', title: 'Lesson 1' },
      ]);
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
      expect(mockOrder).toHaveBeenCalledWith('scheduled_at', { ascending: false });
    });

    it('returns empty array and logs on error', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'db err', code: 'ERR' } });
      expect(await getStudentRecentLessons('s1')).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('[student-detail-queries] lessons error', {
        error: 'db err',
        code: 'ERR',
      });
    });

    it('falls back to a null title when the lesson is untitled', async () => {
      mockLimit.mockResolvedValueOnce({
        data: [
          { id: 'l1', scheduled_at: '2026-07-20T10:00:00Z', status: 'scheduled', title: null },
        ],
        error: null,
      });

      expect(await getStudentRecentLessons('s1')).toEqual([
        { id: 'l1', scheduledAt: '2026-07-20T10:00:00Z', status: 'scheduled', title: null },
      ]);
    });

    it('returns empty array when supabase resolves a null payload without error', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: null });
      expect(await getStudentRecentLessons('s1')).toEqual([]);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('totalPracticeMinutes', () => {
    it('sums practice minutes', () => {
      const rows = [
        {
          id: '1',
          songId: '1',
          songTitle: '',
          songAuthor: '',
          status: '',
          lastPracticedAt: '',
          totalPracticeMinutes: 10,
        },
        {
          id: '2',
          songId: '2',
          songTitle: '',
          songAuthor: '',
          status: '',
          lastPracticedAt: '',
          totalPracticeMinutes: 20,
        },
      ];
      expect(totalPracticeMinutes(rows)).toBe(30);
    });
  });

  describe('getStudentPreferences', () => {
    // Two sequential maybeSingle calls: profiles (skill_level) then
    // user_preferences (goals, learning_style) — 20260727120000.
    it('returns mapped preferences with skill level sourced from profiles', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { skill_level: 'beginner' }, error: null })
        .mockResolvedValueOnce({
          data: { goals: ['play songs'], learning_style: ['visual'] },
          error: null,
        });

      const prefs = await getStudentPreferences('s1');
      expect(prefs).toEqual({
        skillLevel: 'beginner',
        goals: ['play songs'],
        learningStyle: ['visual'],
      });
      expect(mockEq).toHaveBeenCalledWith('id', 's1');
      expect(mockEq).toHaveBeenCalledWith('user_id', 's1');
    });

    it('falls back to empty arrays when goals and learning_style are null', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { skill_level: 'beginner' }, error: null })
        .mockResolvedValueOnce({ data: { goals: null, learning_style: null }, error: null });

      expect(await getStudentPreferences('s1')).toEqual({
        skillLevel: 'beginner',
        goals: [],
        learningStyle: [],
      });
    });

    it('returns intake-set skill level even without an onboarding row', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { skill_level: 'advanced' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      expect(await getStudentPreferences('s1')).toEqual({
        skillLevel: 'advanced',
        goals: [],
        learningStyle: [],
      });
    });

    it('returns an empty skill level when onboarding answers exist but intake did not set one', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { skill_level: null }, error: null })
        .mockResolvedValueOnce({
          data: { goals: ['write riffs'], learning_style: ['audio'] },
          error: null,
        });

      expect(await getStudentPreferences('s1')).toEqual({
        skillLevel: '',
        goals: ['write riffs'],
        learningStyle: ['audio'],
      });
    });

    it('returns null when neither source has data', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { skill_level: null }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });
      expect(await getStudentPreferences('s1')).toBeNull();
    });

    it('returns null and logs on profiles error', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'db err', code: 'ERR' },
      });
      expect(await getStudentPreferences('s1')).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('[student-detail-queries] preferences error', {
        error: 'db err',
        code: 'ERR',
      });
    });

    it('returns null and logs on user_preferences error', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { skill_level: 'beginner' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'db err', code: 'ERR' } });
      expect(await getStudentPreferences('s1')).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('[student-detail-queries] preferences error', {
        error: 'db err',
        code: 'ERR',
      });
    });
  });
});
