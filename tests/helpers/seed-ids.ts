import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { assertNotDeployedRun } from './deployed-target';
import { assertNotProduction, serviceRoleTarget } from './prod-guard';

/**
 * Resolve seed target ids (student/teacher) from the configured test-account
 * emails at runtime, instead of hard-coding profile UUIDs that drift per
 * environment. Use in E2E `beforeAll` blocks that seed student-scoped data.
 */
export function adminClient(): SupabaseClient {
  const { url, key } = serviceRoleTarget();
  // Every spec that seeds or reads via service role comes through here, so this
  // is the gate that keeps them off the production database.
  assertNotDeployedRun('open a service-role client');
  assertNotProduction(url, 'open a service-role client for E2E seeding');
  return createClient(url, key);
}

/**
 * The configured E2E login emails. Specs that assert an address appears on
 * screen should read these rather than hard-coding one: the accounts moved from
 * `@example.com` to `@dev.local` and every literal copy silently went stale.
 */
export const studentEmail = () => process.env.TEST_STUDENT_EMAIL || 'student@dev.local';
export const teacherEmail = () => process.env.TEST_TEACHER_EMAIL || 'teacher@dev.local';
export const adminEmail = () => process.env.TEST_ADMIN_EMAIL || 'admin@dev.local';

async function idByEmail(db: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await db.from('profiles').select('id').eq('email', email).single();
  if (error || !data?.id) {
    throw new Error(`seed-ids: no profile for ${email}: ${error?.message ?? 'not found'}`);
  }
  return data.id as string;
}

/** Profile id of the E2E student login (TEST_STUDENT_EMAIL, default student@dev.local). */
export function getStudentId(db: SupabaseClient): Promise<string> {
  return idByEmail(db, studentEmail());
}

/** Profile id of the E2E teacher login (TEST_TEACHER_EMAIL, default teacher@dev.local). */
export function getTeacherId(db: SupabaseClient): Promise<string> {
  return idByEmail(db, teacherEmail());
}

/**
 * Profile id of the admin (TEST_ADMIN_EMAIL, default admin@dev.local), who
 * is also a teacher. Use as an alternate lesson teacher so specs that seed
 * lessons for the same student in parallel don't collide on the per-(teacher,
 * student) lesson-number trigger.
 */
export function getAdminId(db: SupabaseClient): Promise<string> {
  return idByEmail(db, adminEmail());
}
