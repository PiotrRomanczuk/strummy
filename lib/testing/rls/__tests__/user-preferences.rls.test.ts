/**
 * RLS acceptance test for `user_preferences` teacher read access (IDA-4,
 * docs/app-blueprint/01-identity-access.md).
 *
 * Existing policies only covered self + admin; migration 20260719000006
 * added a teacher SELECT policy. Proves a teacher can read a student's
 * onboarding preferences, matching the any-teacher-may-read pattern already
 * established for profiles/practice_sessions/student_repertoire.
 *
 * REQUIRES migration 20260727100000_identity_model_rls_fixes: the teacher-read
 * policy is now `is_admin_or_teacher()` TO authenticated (the 20260719000006
 * version compared `profiles.id = auth.uid()` — fail-closed for any user whose
 * profile id differs from their auth uid).
 *
 * Identity space: `user_preferences.profile_id` FKs profiles(id) — the fixture's
 * `.id` (PROFILE id) is correct everywhere below. NOTE: the LIVE baseline
 * self-read/write policies still compare `auth.uid() = profile_id`; they are
 * being repointed to `current_profile_id()` by a later migration in this
 * effort — the self-read test targets that end state.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

describeIfRls('user_preferences RLS — teacher read access', () => {
  let fx: TwoTeacherFixture;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    // skill_level moved to profiles.skill_level (single source,
    // 20260727120000) — user_preferences no longer carries the column.
    const { error } = await fx.service.from('user_preferences').insert({
      profile_id: fx.studentA1.id,
      goals: ['play_songs', 'improve_technique'],
      learning_style: ['visual'],
    });
    if (error) throw new Error(`seed user_preferences failed: ${error.message}`);
  }, 30_000);

  afterAll(async () => {
    await fx.service.from('user_preferences').delete().eq('profile_id', fx.studentA1.id);
    await fx?.cleanup();
  });

  // skill_level lives on profiles since 20260727120000 — visibility here is
  // asserted through goals (the policy is what's under test, not the column).
  it('the owning student can read their own preferences', async () => {
    const { data, error } = await fx.studentA1.client
      .from('user_preferences')
      .select('goals')
      .eq('profile_id', fx.studentA1.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.goals).toEqual(['play_songs', 'improve_technique']);
  });

  it('a teacher can read the preferences (new policy)', async () => {
    const { data, error } = await fx.teacherA.client
      .from('user_preferences')
      .select('goals')
      .eq('profile_id', fx.studentA1.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.goals).toEqual(['play_songs', 'improve_technique']);
  });

  it("another student cannot read someone else's preferences", async () => {
    const { data, error } = await fx.studentB1.client
      .from('user_preferences')
      .select('goals')
      .eq('profile_id', fx.studentA1.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});
