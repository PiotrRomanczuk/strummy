/**
 * @jest-environment node
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { queueNotification } from '@/lib/services/notification-service';
import type { LessonDraftApply } from '@/schemas/LessonDraftApplySchema';

import { applyLessonDraft } from '../lesson-transcript-draft-apply';

jest.mock('@/lib/services/notification-service', () => ({ queueNotification: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

type Call = { table: string; op: string; payload?: unknown; options?: unknown; filters: Record<string, unknown> };
type Resolver = (call: Call) => { data: unknown; error: { message: string } | null };

function createMockSupabase(resolve: Resolver): { supabase: SupabaseClient; calls: Call[] } {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: 'select', filters: {} };
    calls.push(call);
    const chain: Record<string, unknown> = {};
    const write = (op: string) => (payload: unknown, options?: unknown) => {
      Object.assign(call, { op, payload, options });
      return chain;
    };
    const filter = (key: string) => (col: string, val: unknown) => {
      call.filters[`${key}:${col}`] = val;
      return chain;
    };
    Object.assign(chain, {
      select: () => chain,
      insert: write('insert'),
      update: write('update'),
      upsert: write('upsert'),
      eq: filter('eq'),
      is: filter('is'),
      gt: filter('gt'),
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve(resolve(call)),
      maybeSingle: () => Promise.resolve(resolve(call)),
      then: (ok: (v: unknown) => unknown, err: (e: unknown) => unknown) => Promise.resolve(resolve(call)).then(ok, err),
    });
    return chain;
  };
  return { supabase: { from } as unknown as SupabaseClient, calls };
}

const LESSON = {
  id: 'lesson-1',
  student_id: 'student-1',
  teacher_id: 'teacher-1',
  title: null,
  notes: 'Notatka nauczyciela',
  status: 'SCHEDULED',
  scheduled_at: '2026-10-18T09:30:00Z',
};
const SONG = '22222222-2222-4222-8222-222222222222';
const SKILL = '44444444-4444-4444-8444-444444444444';

const input: LessonDraftApply = {
  lessonTitle: 'Power chordy',
  notes: '## Piosenki\n- …',
  markCompleted: false,
  songs: [
    { songId: SONG, newSong: null, status: 'started', notes: 'lżej' },
    { songId: null, newSong: { title: 'Blitzkrieg Bop', author: 'Ramones' }, status: 'to_learn', notes: '' },
  ],
  assignment: {
    title: 'Blitzkrieg Bop',
    description: '',
    checklist: ['Znajdź akordy'],
    songId: null,
    dueDate: null,
    dailyTargetMinutes: null,
    submissionType: 'self_report',
  },
  skills: [{ skillId: SKILL, status: 'developing', note: '' }],
};

function happyResolver(claimed = true): Resolver {
  return (call) => {
    if (call.table === 'lesson_transcripts') return { data: claimed ? [{ id: 't-1' }] : [], error: null };
    if (call.table === 'lessons' && call.op === 'select' && call.filters['gt:scheduled_at']) {
      return { data: { scheduled_at: '2026-10-25T09:30:00Z' }, error: null };
    }
    if (call.table === 'lessons' && call.op === 'select') return { data: LESSON, error: null };
    if (call.op === 'insert') return { data: { id: `${call.table}-new` }, error: null };
    return { data: null, error: null };
  };
}

beforeEach(() => jest.clearAllMocks());

describe('applyLessonDraft', () => {
  it('writes lesson, songs, homework and skills in order', async () => {
    const { supabase, calls } = createMockSupabase(happyResolver());
    const result = await applyLessonDraft(supabase, 'lesson-1', input);

    expect(result).toEqual({ ok: true, songs: 2, newSongs: 1, assignmentId: 'assignments-new', skills: 1 });
    const writes = calls.filter((c) => c.op !== 'select').map((c) => `${c.op}:${c.table}`);
    expect(writes).toEqual([
      'update:lesson_transcripts',
      'update:lessons',
      'upsert:lesson_songs',
      'insert:songs',
      'upsert:lesson_songs',
      'insert:assignments',
      'upsert:student_skills',
    ]);
  });

  it('appends notes, sets an empty title, leaves status alone unless asked', async () => {
    const { supabase, calls } = createMockSupabase(happyResolver());
    await applyLessonDraft(supabase, 'lesson-1', input);
    const lessonUpdate = calls.find((c) => c.table === 'lessons' && c.op === 'update');
    expect(lessonUpdate?.payload).toEqual({ notes: 'Notatka nauczyciela\n\n## Piosenki\n- …', title: 'Power chordy' });
  });

  it('marks the lesson COMPLETED only when markCompleted is set', async () => {
    const { supabase, calls } = createMockSupabase(happyResolver());
    await applyLessonDraft(supabase, 'lesson-1', { ...input, markCompleted: true });
    expect(calls.find((c) => c.table === 'lessons' && c.op === 'update')?.payload).toMatchObject({ status: 'COMPLETED' });
  });

  it('creates new songs as drafts, upserts lesson songs on (lesson, song), dates homework to the next lesson', async () => {
    const { supabase, calls } = createMockSupabase(happyResolver());
    await applyLessonDraft(supabase, 'lesson-1', input);

    expect(calls.find((c) => c.op === 'insert' && c.table === 'songs')?.payload).toEqual({ title: 'Blitzkrieg Bop', author: 'Ramones', is_draft: true });
    expect(calls.find((c) => c.table === 'lesson_songs')?.options).toEqual({ onConflict: 'lesson_id,song_id' });
    const assignment = calls.find((c) => c.table === 'assignments')?.payload as Record<string, unknown>;
    expect(assignment).toMatchObject({ lesson_id: 'lesson-1', student_id: 'student-1', due_date: '2026-10-25', status: 'not_started' });
    expect(assignment.checklist).toEqual([expect.objectContaining({ text: 'Znajdź akordy', done: false })]);
    expect(queueNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'assignment_created', recipientUserId: 'student-1' }));
  });

  it('refuses when the draft is not ready (already applied or missing) and writes nothing', async () => {
    const { supabase, calls } = createMockSupabase(happyResolver(false));
    const result = await applyLessonDraft(supabase, 'lesson-1', input);
    expect(result).toMatchObject({ ok: false, code: 'not_ready' });
    expect(calls.filter((c) => c.op !== 'select' && c.table !== 'lesson_transcripts')).toHaveLength(0);
  });

  it('reports a failed write and keeps the draft claimed', async () => {
    const base = happyResolver();
    const { supabase, calls } = createMockSupabase((call) =>
      call.table === 'assignments' ? { data: null, error: { message: 'violates check' } } : base(call)
    );
    const result = await applyLessonDraft(supabase, 'lesson-1', input);
    expect(result).toMatchObject({ ok: false, code: 'write_failed' });
    expect(calls.filter((c) => c.table === 'lesson_transcripts' && c.op === 'update')).toHaveLength(1);
  });
});
