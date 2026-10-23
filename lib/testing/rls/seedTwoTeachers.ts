import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient, signInAs } from './clients';
import { rlsSongTitle } from './run-marker';
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
  /** Insert a fixture song that `cleanup()` deletes (songs have no owner to cascade from). */
  seedSong: (label: string) => Promise<string>;
  /** Deletes every row this fixture made; throws if any delete fails. */
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

  // If seeding fails part-way the caller never receives cleanup(), so delete
  // what was already created before rethrowing (a half-built fixture leaked
  // `rls-teacher-a-*` accounts on every failed run).
  const created: string[] = [];
  const create = async (role: 'teacher' | 'student', userTag: string) => {
    const user = await createRlsUser(service, role, userTag);
    created.push(user.userId);
    return user;
  };
  type CreatedUser = Awaited<ReturnType<typeof createRlsUser>>;
  let tA: CreatedUser, tB: CreatedUser, sA1: CreatedUser, sB1: CreatedUser;
  try {
    tA = await create('teacher', `a-${tag}`);
    tB = await create('teacher', `b-${tag}`);
    sA1 = await create('student', `a1-${tag}`);
    sB1 = await create('student', `b1-${tag}`);
  } catch (error) {
    await Promise.all(created.map((uid) => service.auth.admin.deleteUser(uid)));
    throw error;
  }

  const lessonA = await insertLesson(service, tA.id, sA1.id);
  const lessonB = await insertLesson(service, tB.id, sB1.id);

  const [tAClient, tBClient, sA1Client, sB1Client] = await Promise.all([
    signInAs(tA.email, tA.password),
    signInAs(tB.email, tB.password),
    signInAs(sA1.email, sA1.password),
    signInAs(sB1.email, sB1.password),
  ]);

  const songIds: string[] = [];
  const seedSong = async (label: string): Promise<string> => {
    const { data, error } = await service
      .from('songs')
      .insert({ title: rlsSongTitle(label) })
      .select('id')
      .single();
    if (error || !data) throw new Error(`seed song failed: ${error?.message ?? 'no row'}`);
    songIds.push(data.id);
    return data.id;
  };

  // Teardown must delete AUTH users — auth.admin.deleteUser takes the auth
  // uid, not the profile id. Songs go first: nothing cascades to them.
  // Failures are collected and thrown, never swallowed: a silent
  // Promise.allSettled here leaked 5 562 accounts onto the dev stack.
  const authUids = [tA.userId, tB.userId, sA1.userId, sB1.userId];
  const cleanup = async () => {
    const failures: string[] = [];
    if (songIds.length > 0) {
      const { error } = await service.from('songs').delete().in('id', songIds);
      if (error) failures.push(`songs: ${error.message}`);
    }
    for (const uid of authUids) {
      const { error } = await service.auth.admin.deleteUser(uid);
      if (error) failures.push(`deleteUser ${uid}: ${error.message}`);
    }
    if (failures.length > 0) throw new Error(`RLS fixture cleanup failed:\n${failures.join('\n')}`);
  };

  return {
    service,
    teacherA: { ...tA, client: tAClient },
    teacherB: { ...tB, client: tBClient },
    studentA1: { ...sA1, client: sA1Client },
    studentB1: { ...sB1, client: sB1Client },
    lessonA,
    lessonB,
    seedSong,
    cleanup,
  };
}
