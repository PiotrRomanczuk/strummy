/**
 * Integration test: locks the intentional auto-upsert behavior of
 * `addSongsToLesson` (used by the create path) — songs attached to a lesson
 * are added to the student's repertoire with status `to_learn` if not already
 * there, idempotently. This is the documented contract that backs the
 * (reframed) `create-lesson:no-silent-repertoire-mutation` scenario in
 * `tasks/unbreakable-core.md`.
 */

import { addSongsToLesson } from '@/app/api/(curriculum)/lessons/utils';

const STUDENT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const TEACHER_ID = 'aaaaaaaa-2222-4222-8222-222222222222';
const LESSON_ID = 'aaaaaaaa-3333-4333-8333-333333333333';
const SONG_IDS = ['aaaaaaaa-4444-4444-8444-444444444444', 'aaaaaaaa-5555-4555-8555-555555555555'];

function buildClient(opts?: { onLessonSongsError?: { message: string } }) {
  // 1. lessons lookup chain: from(lessons).select().eq().single() returns lesson.
  // 2. student_repertoire upsert chain: from(student_repertoire).upsert(rows, opts).
  // 3. student_repertoire select chain: from(student_repertoire).select().eq().in() returns map.
  // 4. lesson_songs insert chain: from(lesson_songs).insert(rows) returns error or null.
  const lessonsSelectSingle = jest.fn().mockResolvedValue({
    data: { student_id: STUDENT_ID, teacher_id: TEACHER_ID },
    error: null,
  });
  const lessonsBuilder = {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({ single: lessonsSelectSingle })),
    })),
  };

  const repertoireUpsert = jest.fn().mockResolvedValue({ data: null, error: null });
  const repertoireSelectIn = jest.fn().mockResolvedValue({
    data: SONG_IDS.map((id, i) => ({ id: `rep-${i}`, song_id: id })),
    error: null,
  });
  const repertoireBuilder = {
    upsert: repertoireUpsert,
    select: jest.fn(() => ({
      eq: jest.fn(() => ({ in: repertoireSelectIn })),
    })),
  };

  const lessonSongsInsert = jest
    .fn()
    .mockResolvedValue({ error: opts?.onLessonSongsError ?? null });
  const lessonSongsBuilder = { insert: lessonSongsInsert };

  return {
    client: {
      from: jest.fn((table: string) => {
        if (table === 'lessons') return lessonsBuilder;
        if (table === 'student_repertoire') return repertoireBuilder;
        if (table === 'lesson_songs') return lessonSongsBuilder;
        throw new Error(`unexpected table: ${table}`);
      }),
    },
    repertoireUpsert,
    lessonSongsInsert,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('addSongsToLesson — intentional repertoire upsert on create', () => {
  it('upserts each song into student_repertoire with status=to_learn and assigned_by=teacher', async () => {
    const { client, repertoireUpsert } = buildClient();

    await addSongsToLesson(client as never, LESSON_ID, SONG_IDS);

    expect(repertoireUpsert).toHaveBeenCalledTimes(1);
    const [rows, opts] = repertoireUpsert.mock.calls[0];
    expect(rows).toEqual([
      {
        student_id: STUDENT_ID,
        song_id: SONG_IDS[0],
        assigned_by: TEACHER_ID,
        current_status: 'to_learn',
      },
      {
        student_id: STUDENT_ID,
        song_id: SONG_IDS[1],
        assigned_by: TEACHER_ID,
        current_status: 'to_learn',
      },
    ]);
    // ON CONFLICT DO NOTHING is what makes the auto-add idempotent.
    expect(opts).toEqual({
      onConflict: 'student_id,song_id',
      ignoreDuplicates: true,
    });
  });

  it('inserts lesson_songs rows linking lesson + song + repertoire_id', async () => {
    const { client, lessonSongsInsert } = buildClient();

    await addSongsToLesson(client as never, LESSON_ID, SONG_IDS);

    expect(lessonSongsInsert).toHaveBeenCalledTimes(1);
    const [rows] = lessonSongsInsert.mock.calls[0];
    expect(rows).toEqual([
      { lesson_id: LESSON_ID, song_id: SONG_IDS[0], repertoire_id: 'rep-0' },
      { lesson_id: LESSON_ID, song_id: SONG_IDS[1], repertoire_id: 'rep-1' },
    ]);
  });

  it('is a no-op when songIds is empty', async () => {
    const { client, repertoireUpsert, lessonSongsInsert } = buildClient();

    await addSongsToLesson(client as never, LESSON_ID, []);

    expect(client.from).not.toHaveBeenCalled();
    expect(repertoireUpsert).not.toHaveBeenCalled();
    expect(lessonSongsInsert).not.toHaveBeenCalled();
  });
});
