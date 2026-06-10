import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrudFixtures } from '../lib/fixtures';

type Role = 'admin' | 'teacherA' | 'teacherB' | 'studentA' | 'studentB';
type Expect = 'allow' | 'deny';

export type MatrixCell = {
  label: string;
  role: Role;
  expect: Expect;
  run: (
    client: SupabaseClient,
    fx: CrudFixtures
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

// v1: lessons-only. ~7 cells: each role's important happy paths + key denies.
// Each cell returns a Supabase-shape result so the runner can call expectAllowed/expectDenied.
export const LESSONS_MATRIX: MatrixCell[] = [
  {
    label: 'student READ own lesson',
    role: 'studentA',
    expect: 'allow',
    run: (c, fx) => c.from('lessons').select('id, title').eq('id', fx.lessonA),
  },
  {
    label: "student READ other student's lesson",
    role: 'studentA',
    expect: 'deny',
    run: (c, fx) => c.from('lessons').select('id, title').eq('id', fx.lessonB),
  },
  {
    label: 'teacher READ own lesson',
    role: 'teacherA',
    expect: 'allow',
    run: (c, fx) => c.from('lessons').select('id, title').eq('id', fx.lessonA),
  },
  {
    label: "teacher READ other teacher's lesson",
    role: 'teacherA',
    expect: 'deny',
    run: (c, fx) => c.from('lessons').select('id, title').eq('id', fx.lessonB),
  },
  {
    label: 'teacher UPDATE own lesson title',
    role: 'teacherA',
    expect: 'allow',
    run: (c, fx) =>
      c.from('lessons').update({ title: 'Updated by verify' }).eq('id', fx.lessonA).select('id'),
  },
  {
    label: "teacher UPDATE other teacher's lesson",
    role: 'teacherA',
    expect: 'deny',
    run: (c, fx) =>
      c.from('lessons').update({ title: 'Should not work' }).eq('id', fx.lessonB).select('id'),
  },
  {
    label: 'student CREATE lesson (should be denied)',
    role: 'studentA',
    expect: 'deny',
    run: (c, fx) =>
      c
        .from('lessons')
        .insert({
          teacher_id: fx.teacherA.id,
          student_id: fx.studentA.id,
          scheduled_at: new Date().toISOString(),
          title: 'Student creating a lesson',
        })
        .select('id'),
  },
  {
    label: 'admin CREATE lesson',
    role: 'admin',
    expect: 'allow',
    run: (c, fx) =>
      c
        .from('lessons')
        .insert({
          teacher_id: fx.teacherA.id,
          student_id: fx.studentA.id,
          scheduled_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
          title: 'Admin-created lesson (verify)',
        })
        .select('id'),
  },
  {
    label: 'admin DELETE any lesson (operates on pre-seeded lessonA)',
    role: 'admin',
    expect: 'allow',
    run: (c, fx) => c.from('lessons').delete().eq('id', fx.lessonA).select('id'),
  },
];
