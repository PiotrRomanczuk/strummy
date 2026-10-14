/**
 * @jest-environment node
 */

import { ingestTranscript, type IngestTranscriptInput } from '../lesson-transcripts';
import type { Admin } from '../lesson-transcript-matching';

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

// ---------------------------------------------------------------------------
// A recording query builder: every chained call lands on one `Call`, and the
// test's resolver decides what that call returns. Lets each case assert on
// which tables were touched and with what payload, not just on the result.
// ---------------------------------------------------------------------------

type Call = {
  table: string;
  op: 'select' | 'insert' | 'update';
  filters: Record<string, unknown>;
  payload?: Record<string, unknown>;
};
type Resolver = (call: Call) => { data: unknown; error: { message: string } | null };

function createMockAdmin(resolve: Resolver): { admin: Admin; calls: Call[] } {
  const calls: Call[] = [];
  const from = jest.fn((table: string) => {
    const call: Call = { table, op: 'select', filters: {} };
    calls.push(call);
    const chain: Record<string, unknown> = {};
    const filter = (key: string) =>
      jest.fn((...args: unknown[]) => {
        call.filters[args.length > 1 ? String(args[0]) : key] = args.length > 1 ? args[1] : args[0];
        return chain;
      });
    Object.assign(chain, {
      select: jest.fn(() => chain),
      insert: jest.fn((payload: Record<string, unknown>) => {
        Object.assign(call, { op: 'insert', payload });
        return chain;
      }),
      update: jest.fn((payload: Record<string, unknown>) => {
        Object.assign(call, { op: 'update', payload });
        return chain;
      }),
      eq: filter('eq'),
      is: filter('is'),
      gte: filter('gte'),
      lte: filter('lte'),
      or: filter('or'),
      limit: jest.fn(() => chain),
      single: jest.fn(() => Promise.resolve(resolve(call))),
      maybeSingle: jest.fn(() => Promise.resolve(resolve(call))),
      then: (onOk: (v: unknown) => unknown, onErr: (e: unknown) => unknown) =>
        Promise.resolve(resolve(call)).then(onOk, onErr),
    });
    return chain;
  });
  return { admin: { from } as unknown as Admin, calls };
}

const STUDENT = {
  id: 'student-1',
  full_name: 'Jan Kowalski',
  email: 'Jan@Example.pl',
  invite_email: null,
};

const baseInput: IngestTranscriptInput = {
  source: 'wispr',
  external_id: 'wispr-abc',
  started_at: '2026-10-13T16:00:00.000Z',
  ended_at: '2026-10-13T16:45:00.000Z',
  student_email: 'JAN@example.PL',
  transcript: 'Teacher: Let us start with Hammer to Fall. Student: sztos, trzeba to nagrać.',
  language: 'pl',
  teacherProfileId: 'teacher-1',
};

const ok = (data: unknown) => ({ data, error: null });

describe('ingestTranscript', () => {
  it('attaches to the existing lesson nearest started_at (case-insensitive email)', async () => {
    const { admin, calls } = createMockAdmin((call) => {
      if (call.table === 'profiles') return ok([STUDENT]);
      if (call.table === 'lessons')
        return ok([
          { id: 'lesson-far', scheduled_at: '2026-10-13T17:10:00.000Z' },
          { id: 'lesson-near', scheduled_at: '2026-10-13T16:05:00.000Z' },
        ]);
      if (call.table === 'lesson_transcripts' && call.op === 'insert') return ok({ id: 'tr-1' });
      return ok(null);
    });

    const result = await ingestTranscript(admin, baseInput);

    expect(result).toEqual({
      lessonId: 'lesson-near',
      transcriptId: 'tr-1',
      lessonCreated: false,
      student: { id: 'student-1', name: 'Jan Kowalski' },
    });
    expect(calls.some((c) => c.table === 'lessons' && c.op === 'insert')).toBe(false);
    const insert = calls.find((c) => c.table === 'lesson_transcripts' && c.op === 'insert');
    expect(insert?.payload).toMatchObject({
      lesson_id: 'lesson-near',
      external_id: 'wispr-abc',
      body: baseInput.transcript,
      created_by: 'teacher-1',
    });
  });

  it('creates a COMPLETED lesson when nothing is scheduled within ±90 min', async () => {
    const { admin, calls } = createMockAdmin((call) => {
      if (call.table === 'profiles') return ok([STUDENT]);
      if (call.table === 'lessons' && call.op === 'select') return ok([]);
      if (call.table === 'lessons' && call.op === 'insert') return ok({ id: 'lesson-new' });
      if (call.table === 'lesson_transcripts' && call.op === 'insert') return ok({ id: 'tr-2' });
      return ok(null);
    });

    const result = await ingestTranscript(admin, baseInput);

    expect(result).toMatchObject({
      lessonId: 'lesson-new',
      transcriptId: 'tr-2',
      lessonCreated: true,
    });
    const lessonInsert = calls.find((c) => c.table === 'lessons' && c.op === 'insert');
    expect(lessonInsert?.payload).toEqual({
      teacher_id: 'teacher-1',
      student_id: 'student-1',
      scheduled_at: baseInput.started_at,
      duration_minutes: 45,
      title: 'Lekcja 2026-10-13',
      status: 'COMPLETED',
    });
  });

  it('re-ingesting the same external_id updates the text and returns the same ids', async () => {
    const { admin, calls } = createMockAdmin((call) => {
      if (call.table === 'profiles') return ok([STUDENT]);
      if (call.table === 'lesson_transcripts' && call.filters.external_id === 'wispr-abc')
        return ok({ id: 'tr-1', lesson_id: 'lesson-near' });
      return ok(null);
    });

    const result = await ingestTranscript(admin, { ...baseInput, summary: 'Second pass' });

    expect(result).toMatchObject({
      lessonId: 'lesson-near',
      transcriptId: 'tr-1',
      lessonCreated: false,
    });
    expect(calls.some((c) => c.table === 'lessons')).toBe(false);
    const update = calls.find((c) => c.table === 'lesson_transcripts' && c.op === 'update');
    expect(update?.filters).toEqual({ id: 'tr-1' });
    expect(update?.payload).toMatchObject({ summary: 'Second pass', body: baseInput.transcript });
  });

  it('returns student_not_found without touching lessons when no profile matches', async () => {
    const { admin, calls } = createMockAdmin((call) => {
      // ilike would also match `j_n@example.pl` — the exact check must reject it.
      if (call.table === 'profiles') return ok([{ ...STUDENT, email: 'j_n@example.pl' }]);
      return ok(null);
    });

    const result = await ingestTranscript(admin, { ...baseInput, student_email: 'jan@example.pl' });

    expect(result).toEqual({ error: 'student_not_found' });
    expect(calls.map((c) => c.table)).toEqual(['profiles']);
  });
});
