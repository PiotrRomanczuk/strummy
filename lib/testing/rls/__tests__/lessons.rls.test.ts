/**
 * RLS acceptance tests for `lessons` (spec 02 §DoD-3).
 *
 * Proves teacher isolation and student own-only visibility against a real
 * Supabase via the two-teacher harness (auth → JWT → RLS path).
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';
import {
  getLessonsHandler,
  updateLessonHandler,
  deleteLessonHandler,
} from '@/app/api/lessons/handlers';

const teacherProfile = { isAdmin: false, isTeacher: true, isStudent: false };
const studentProfile = { isAdmin: false, isTeacher: false, isStudent: true };

describeIfRls('lessons RLS — teacher isolation + student own-only', () => {
  let fx: TwoTeacherFixture;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
  }, 30_000);

  afterAll(async () => {
    await fx?.cleanup();
  });

  it('teacher sees their own lesson', async () => {
    const { data, error } = await fx.teacherA.client
      .from('lessons')
      .select('id, teacher_id')
      .eq('id', fx.lessonA.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(fx.lessonA.id);
  });

  it("teacher CANNOT see another teacher's lesson", async () => {
    const { data, error } = await fx.teacherA.client
      .from('lessons')
      .select('id')
      .eq('id', fx.lessonB.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('student sees their own lesson', async () => {
    const { data, error } = await fx.studentA1.client
      .from('lessons')
      .select('id, student_id')
      .eq('id', fx.lessonA.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.student_id).toBe(fx.studentA1.id);
  });

  it("student CANNOT see another student's lesson", async () => {
    const { data, error } = await fx.studentA1.client
      .from('lessons')
      .select('id')
      .eq('id', fx.lessonB.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('soft-deleted lessons are hidden from their teacher', async () => {
    await fx.service
      .from('lessons')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fx.lessonA.id);
    const { data } = await fx.teacherA.client
      .from('lessons')
      .select('id')
      .eq('id', fx.lessonA.id)
      .is('deleted_at', null)
      .maybeSingle();
    expect(data).toBeNull();
    // restore so other assertions/order independence holds
    await fx.service.from('lessons').update({ deleted_at: null }).eq('id', fx.lessonA.id);
  });

  /**
   * Regression tests for a confirmed IDOR: /api/lessons GET used the admin
   * (service-role) client with no app-side filter, so any authenticated user
   * — via getLessonsHandler with no query params — got every lesson in the
   * system. These call the production handler functions directly with a
   * real, RLS-scoped per-role client, exactly as the routes do post-fix.
   */
  describe('getLessonsHandler — RLS-scoped list, no cross-role leakage', () => {
    it('student sees only their own lesson, never the other student/teacher pair', async () => {
      const result = await getLessonsHandler(fx.studentA1.client, fx.studentA1, studentProfile, {});
      expect(result.status).toBe(200);
      const ids = (result.lessons as { id: string }[]).map((l) => l.id);
      expect(ids).toContain(fx.lessonA.id);
      expect(ids).not.toContain(fx.lessonB.id);
    });

    it("teacher sees only their own lesson, never the other teacher's — even with no query params", async () => {
      const result = await getLessonsHandler(fx.teacherA.client, fx.teacherA, teacherProfile, {});
      expect(result.status).toBe(200);
      const ids = (result.lessons as { id: string }[]).map((l) => l.id);
      expect(ids).toContain(fx.lessonA.id);
      expect(ids).not.toContain(fx.lessonB.id);
    });
  });

  /**
   * Regression tests for the horizontal-privilege RLS gap on UPDATE/DELETE
   * (lessons_update_policy / lessons_delete_policy / the legacy duplicate
   * lessons_update / lessons_delete — all previously granted to ANY teacher,
   * not the owning one). Fixed by migration
   * 20260715120001_scope_lessons_update_delete_to_teacher.sql.
   */
  describe('updateLessonHandler / deleteLessonHandler — teacher ownership scoping', () => {
    it("teacher A cannot update teacher B's lesson", async () => {
      const result = await updateLessonHandler(
        fx.teacherA.client,
        fx.teacherA,
        teacherProfile,
        fx.lessonB.id,
        { notes: 'hijacked by teacher A' }
      );
      expect(result.status).toBe(404);

      const { data } = await fx.service
        .from('lessons')
        .select('notes')
        .eq('id', fx.lessonB.id)
        .single();
      expect(data?.notes).not.toBe('hijacked by teacher A');
    });

    it("teacher A cannot delete teacher B's lesson", async () => {
      const result = await deleteLessonHandler(
        fx.teacherA.client,
        fx.teacherA,
        teacherProfile,
        fx.lessonB.id
      );
      expect(result.status).toBe(404);

      const { data } = await fx.service
        .from('lessons')
        .select('deleted_at')
        .eq('id', fx.lessonB.id)
        .single();
      expect(data?.deleted_at).toBeNull();
    });
  });
});
