import { createLessonAction, updateLessonAction } from '../lesson-edit';
import * as helpers from '../lesson-edit.helpers';
import * as utils from '@/app/api/lessons/utils';
import * as sync from '@/lib/services/calendar-lesson-sync';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: jest.fn(),
}));

jest.mock('@/lib/auth/test-account-guard', () => ({
  guardTestAccountMutation: jest.fn(),
}));

const mockUpdate = jest.fn();
jest.mock('@/app/api/lessons/utils', () => ({
  insertLessonRecord: jest.fn(),
  addSongsToLesson: jest.fn(),
  handleLessonSongsUpdate: jest.fn(),
  prepareLessonForDb: jest.fn((data) => data),
}));

jest.mock('@/lib/services/calendar-lesson-sync', () => ({
  syncLessonCreation: jest.fn(),
  syncLessonUpdate: jest.fn(),
}));

jest.mock('../lesson-edit.helpers', () => ({
  resolveStudent: jest.fn(),
}));

const mockSingle = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({ single: mockSingle }),
          }),
        }),
      }),
    })
  ),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }),
}));

describe('lesson-edit actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (guardTestAccountMutation as jest.Mock).mockReturnValue(null);
  });

  describe('createLessonAction', () => {
    it('requires auth and role', async () => {
      (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ user: null });
      expect(await createLessonAction({ scheduledAt: '2026-07-20T10:00:00Z' })).toEqual({ error: 'Unauthorized' });

      (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ user: { id: 's1' }, isAdmin: false, isTeacher: false });
      expect(await createLessonAction({ scheduledAt: '2026-07-20T10:00:00Z' })).toEqual({ error: 'Only teachers and admins can create lessons' });
    });

    it('prevents teachers from creating lessons for other teachers', async () => {
      (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ user: { id: '123e4567-e89b-12d3-a456-426614174001' }, isTeacher: true, isAdmin: false });
      expect(await createLessonAction({ teacherId: '123e4567-e89b-12d3-a456-426614174002', scheduledAt: '2026-07-20T10:00:00Z' })).toEqual({ error: 'Teachers can only create lessons for themselves' });
    });

    it('returns error if resolveStudent fails', async () => {
      (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ user: { id: '123e4567-e89b-12d3-a456-426614174001' }, isTeacher: true, isAdmin: false });
      (helpers.resolveStudent as jest.Mock).mockResolvedValue({ ok: false, error: 'ambiguous', ambiguous: true });
      expect(await createLessonAction({ scheduledAt: '2026-07-20T10:00:00Z' })).toEqual({ error: 'ambiguous', ambiguous: true });
    });

    it('creates a lesson successfully', async () => {
      (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ user: { id: '123e4567-e89b-12d3-a456-426614174001' }, isTeacher: true, isAdmin: false });
      (helpers.resolveStudent as jest.Mock).mockResolvedValue({ ok: true, studentId: '123e4567-e89b-12d3-a456-426614174000' });
      (utils.insertLessonRecord as jest.Mock).mockResolvedValue({ data: { id: 'L1' }, error: null });

      const result = await createLessonAction({
        scheduledAt: '2026-07-20T10:00:00Z',
        title: 'Title',
        songIds: ['song1'],
      });

      expect(result).toEqual({ lessonId: 'L1' });
      expect(utils.insertLessonRecord).toHaveBeenCalled();
      expect(utils.addSongsToLesson).toHaveBeenCalledWith(expect.anything(), 'L1', ['song1']);
      expect(sync.syncLessonCreation).toHaveBeenCalled();
    });
  });

  describe('updateLessonAction', () => {
    it('requires auth and role', async () => {
      (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ user: null });
      expect(await updateLessonAction('L1', { scheduledAt: '2026-07-20T10:00:00Z' })).toEqual({ error: 'Unauthorized' });
    });

    it('updates a lesson successfully', async () => {
      (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ user: { id: 't1' }, isTeacher: true, isAdmin: false });
      mockSingle.mockResolvedValue({ data: { id: 'L1' }, error: null });

      const result = await updateLessonAction('L1', {
        scheduledAt: '2026-07-21T10:00:00Z',
        title: 'New Title',
        songIds: ['song2'],
      });

      expect(result).toEqual({ lessonId: 'L1' });
      expect(utils.handleLessonSongsUpdate).toHaveBeenCalledWith(expect.anything(), 'L1', ['song2']);
      expect(sync.syncLessonUpdate).toHaveBeenCalled();
    });

    it('returns error if lesson not found', async () => {
      (getUserWithRolesSSR as jest.Mock).mockResolvedValue({ user: { id: 't1' }, isTeacher: true, isAdmin: false });
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } });

      const result = await updateLessonAction('L1', { scheduledAt: '2026-07-21T10:00:00Z' });
      expect(result).toEqual({ error: 'Lesson not found' });
    });
  });
});
