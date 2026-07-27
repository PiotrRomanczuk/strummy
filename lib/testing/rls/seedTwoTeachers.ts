import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient, signInAs } from './clients';
import { createRlsUser, type SeededUser } from './seedUser';

export type { SeededUser } from './seedUser';

/** teacher_id / student_id are PROFILE ids (lessons FKs → profiles.id). */
export type SeededLesson = {
  id: string;
  teacher_id: string;
  student_id: string;
};

export type TwoTeacherFixture = {
  service: SupabaseClient;
  teacherA: SeededUser;
  teacherB: SeededUser;
  studentA1: SeededUser;
  studentB1: SeededUser;
  lessonA: SeededLesson;
  lessonB: SeededLesson;
  cleanup: () => Promise<void>;
};

async function insertLesson(
  service: SupabaseClient,
  teacher_id: string,
  student_id: string
): Promise<SeededLesson> {
  const { data, error } = await service
    .from('lessons')
    .insert({
      teacher_id,
      student_id,
      title: 'RLS fixture lesson',
      scheduled_at: new Date().toISOString(),
    })
    .select('id, teacher_id, student_id')
    .single();
  if (error || !data) {
    throw new Error(`insertLesson failed: ${error?.message ?? 'no row'}`);
  }
  return data as SeededLesson;
}

/**
 * Seed two independent teachers, one student each, and one lesson per teacher.
 * Returns pre-authenticated RLS-real clients plus a `cleanup()` that deletes
 * the auth users (cascades to profiles + lessons via profiles.user_id).
 *
 * Profiles are seeded THROUGH the real handle_new_user trigger (see
 * {@link createRlsUser}) — `fixture.<user>.id` is the PROFILE id, which may
 * differ from the auth uid (`fixture.<user>.userId`). Use `.id` for every FK
 * column and `.userId` only for auth-scoped paths.
 *
 * Each call uses a unique email tag so concurrent test runs don't collide.
 */
export async function seedTwoTeachers(): Promise<TwoTeacherFixture> {
  const service = createServiceClient();
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const tA = await createRlsUser(service, 'teacher', `a-${tag}`);
  const tB = await createRlsUser(service, 'teacher', `b-${tag}`);
  const sA1 = await createRlsUser(service, 'student', `a1-${tag}`);
  const sB1 = await createRlsUser(service, 'student', `b1-${tag}`);

  const lessonA = await insertLesson(service, tA.id, sA1.id);
  const lessonB = await insertLesson(service, tB.id, sB1.id);

  const [tAClient, tBClient, sA1Client, sB1Client] = await Promise.all([
    signInAs(tA.email, tA.password),
    signInAs(tB.email, tB.password),
    signInAs(sA1.email, sA1.password),
    signInAs(sB1.email, sB1.password),
  ]);

  // Teardown must delete AUTH users — auth.admin.deleteUser takes the auth
  // uid, not the profile id.
  const authUids = [tA.userId, tB.userId, sA1.userId, sB1.userId];
  const cleanup = async () => {
    await Promise.allSettled(authUids.map((uid) => service.auth.admin.deleteUser(uid)));
  };

  return {
    service,
    teacherA: { ...tA, client: tAClient },
    teacherB: { ...tB, client: tBClient },
    studentA1: { ...sA1, client: sA1Client },
    studentB1: { ...sB1, client: sB1Client },
    lessonA,
    lessonB,
    cleanup,
  };
}
