/**
 * Transcript-draft server actions: auth gate, role gate, Zod validation,
 * and the happy path of each accept (what it writes and where).
 */

import {
  acceptDraftNextLessonAction,
  acceptDraftNotesAction,
  discardTranscriptDraftAction,
  generateTranscriptDraftAction,
} from '../transcript-draft';
import { acceptDraftHomeworkAction, acceptDraftSongAction } from '../transcript-draft-accept';

const LESSON = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const SONG = '33333333-3333-4333-8333-333333333333';

const mockGetUser = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: () => mockGetUser() }));

const teacher = {
  user: { id: 'u' },
  profileId: 'p-teacher',
  isAdmin: false,
  isTeacher: true,
  isDevelopment: false,
};

const mockService = {
  generateTranscriptDraft: jest.fn(),
  discardTranscriptDraft: jest.fn(),
  markDraftItemAccepted: jest.fn(),
};
jest.mock('@/lib/services/transcript-draft', () => ({
  generateTranscriptDraft: (...a: unknown[]) => mockService.generateTranscriptDraft(...a),
  discardTranscriptDraft: (...a: unknown[]) => mockService.discardTranscriptDraft(...a),
  markDraftItemAccepted: (...a: unknown[]) => mockService.markDraftItemAccepted(...a),
}));

const mockLessonActions = { updateLessonSongs: jest.fn(), updateLessonSongStatus: jest.fn() };
jest.mock('@/app/dashboard/lessons/actions', () => ({
  updateLessonSongs: (...a: unknown[]) => mockLessonActions.updateLessonSongs(...a),
  updateLessonSongStatus: (...a: unknown[]) => mockLessonActions.updateLessonSongStatus(...a),
}));

const mockCreateAssignment = jest.fn();
jest.mock('../assignment-edit', () => ({
  createAssignmentAction: (v: unknown) => mockCreateAssignment(v),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

/** Scripted tables: `lessons` answers maybeSingle in order; writes are recorded. */
const tables: Record<string, unknown[]> = {};
const updates: { table: string; payload: unknown; eq: unknown[] }[] = [];
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const eq: unknown[] = [];
      const chain: Record<string, unknown> = {};
      Object.assign(chain, {
        select: () => chain,
        eq: (...a: unknown[]) => (eq.push(a), chain),
        gt: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: tables[table]?.shift() ?? null, error: null }),
        update: (payload: unknown) => {
          updates.push({ table, payload, eq });
          return { eq: async () => ({ error: null }) };
        },
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: tables[table]?.shift() ?? [], error: null }),
      });
      return chain;
    },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue(teacher);
  for (const k of Object.keys(tables)) delete tables[k];
  updates.length = 0;
});

describe('gates', () => {
  it('rejects anonymous users', async () => {
    mockGetUser.mockResolvedValue({
      user: null,
      profileId: null,
      isAdmin: false,
      isTeacher: false,
      isDevelopment: false,
    });
    expect(await generateTranscriptDraftAction(LESSON)).toEqual({
      ok: false,
      error: 'Unauthorized',
    });
  });

  it('rejects students', async () => {
    mockGetUser.mockResolvedValue({ ...teacher, isTeacher: false });
    const res = await acceptDraftNotesAction(LESSON, 'x');
    expect(res.ok).toBe(false);
    expect(mockService.markDraftItemAccepted).not.toHaveBeenCalled();
  });

  it('blocks test accounts', async () => {
    mockGetUser.mockResolvedValue({ ...teacher, isDevelopment: true });
    const res = await discardTranscriptDraftAction(LESSON);
    expect(res).toMatchObject({ ok: false });
    expect(mockService.discardTranscriptDraft).not.toHaveBeenCalled();
  });

  it('validates input with Zod', async () => {
    expect(await generateTranscriptDraftAction('nope')).toEqual({
      ok: false,
      error: 'Invalid lesson id',
    });
    expect(await acceptDraftSongAction(LESSON, { index: 0, songId: SONG, status: 'done' })).toEqual(
      { ok: false, error: 'Invalid input' }
    );
    expect(await acceptDraftHomeworkAction(LESSON, STUDENT, { index: 0, title: '' })).toEqual({
      ok: false,
      error: 'Invalid input',
    });
    expect(await acceptDraftNextLessonAction(LESSON, { index: 9, text: 'x' })).toEqual({
      ok: false,
      error: 'Invalid input',
    });
  });
});

describe('generate / discard', () => {
  it('reports noTranscript when the service finds none', async () => {
    mockService.generateTranscriptDraft.mockResolvedValue(null);
    expect(await generateTranscriptDraftAction(LESSON)).toEqual({ ok: true, noTranscript: true });
  });

  it('surfaces an agent failure as an error result', async () => {
    mockService.generateTranscriptDraft.mockRejectedValue(new Error('model down'));
    expect(await generateTranscriptDraftAction(LESSON)).toEqual({ ok: false, error: 'model down' });
  });

  it('discards through the service', async () => {
    mockService.discardTranscriptDraft.mockResolvedValue(undefined);
    expect(await discardTranscriptDraftAction(LESSON)).toEqual({ ok: true });
    expect(mockService.discardTranscriptDraft).toHaveBeenCalledWith(expect.anything(), LESSON);
  });
});

describe('accepts', () => {
  it('notes: appends after --- and marks accepted', async () => {
    tables.lessons = [{ notes: 'stare' }];
    expect(await acceptDraftNotesAction(LESSON, 'nowe')).toEqual({ ok: true });
    expect(updates[0]).toMatchObject({
      table: 'lessons',
      payload: { notes: 'stare\n\n---\n\nnowe' },
    });
    expect(mockService.markDraftItemAccepted).toHaveBeenCalledWith(expect.anything(), LESSON, {
      kind: 'notes',
    });
  });

  it('song: adds to lesson_songs keeping existing ones, then sets the status', async () => {
    tables.lesson_songs = [[{ song_id: 'existing' }]];
    expect(
      await acceptDraftSongAction(LESSON, { index: 1, songId: SONG, status: 'started' })
    ).toEqual({ ok: true });
    expect(mockLessonActions.updateLessonSongs).toHaveBeenCalledWith(LESSON, ['existing', SONG]);
    expect(mockLessonActions.updateLessonSongStatus).toHaveBeenCalledWith(LESSON, SONG, 'started');
    expect(mockService.markDraftItemAccepted).toHaveBeenCalledWith(expect.anything(), LESSON, {
      kind: 'songs',
      index: 1,
    });
  });

  it('song: skips the add when already on the lesson', async () => {
    tables.lesson_songs = [[{ song_id: SONG }]];
    await acceptDraftSongAction(LESSON, { index: 0, songId: SONG, status: 'mastered' });
    expect(mockLessonActions.updateLessonSongs).not.toHaveBeenCalled();
    expect(mockLessonActions.updateLessonSongStatus).toHaveBeenCalled();
  });

  it('homework: creates an assignment due at the next scheduled lesson', async () => {
    tables.lessons = [{ id: 'next', scheduled_at: '2026-10-21T10:00:00.000Z', notes: null }];
    mockCreateAssignment.mockResolvedValue({ assignmentId: 'a-1' });
    const res = await acceptDraftHomeworkAction(LESSON, STUDENT, {
      index: 0,
      title: 'Ćwicz A-D-E',
      description: '5 min',
    });
    expect(res).toEqual({ ok: true, assignmentId: 'a-1' });
    expect(mockCreateAssignment).toHaveBeenCalledWith({
      studentId: STUDENT,
      lessonId: LESSON,
      title: 'Ćwicz A-D-E',
      description: '5 min',
      dueDate: '2026-10-21T10:00:00.000Z',
      songId: null,
    });
  });

  it('homework: falls back to +7 days without a next lesson', async () => {
    tables.lessons = [];
    mockCreateAssignment.mockResolvedValue({ assignmentId: 'a-2' });
    await acceptDraftHomeworkAction(LESSON, STUDENT, { index: 0, title: 'T' });
    const due = new Date(mockCreateAssignment.mock.calls[0][0].dueDate).getTime();
    expect(due - Date.now()).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
  });

  it('next lesson: appends a bullet to the next scheduled lesson, or reports none', async () => {
    tables.lessons = [
      { student_id: STUDENT, scheduled_at: '2026-10-11T14:00:00.000Z' },
      { id: 'next', scheduled_at: '2026-10-18T14:00:00.000Z', notes: 'plan' },
    ];
    expect(await acceptDraftNextLessonAction(LESSON, { index: 0, text: 'Zwrotka' })).toEqual({
      ok: true,
    });
    expect(updates[0]).toMatchObject({
      table: 'lessons',
      payload: { notes: 'plan\n\n---\n\n- Zwrotka' },
    });

    tables.lessons = [{ student_id: STUDENT, scheduled_at: '2026-10-11T14:00:00.000Z' }];
    expect(await acceptDraftNextLessonAction(LESSON, { index: 0, text: 'Zwrotka' })).toEqual({
      ok: true,
      noNextLesson: true,
    });
  });
});
