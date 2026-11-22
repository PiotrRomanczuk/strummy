/**
 * RLS acceptance tests for teacher notes about a student (#1096, migration
 * 20261116150000).
 *
 * Row-level security hands the whole profiles row to the student, to their
 * parent and — for a teacher's own row — to that teacher's students, so the
 * notes cannot stay on it. Writes still go to profiles.notes; a trigger moves
 * the text into student_private_notes, which only staff can read.
 */

import {
  createSignedInRlsUser,
  describeIfRls,
  seedTwoTeachers,
  type SeededUser,
  type TwoTeacherFixture,
} from '../index';

const NOTE = 'RLS private note: struggles with barre chords';

describeIfRls('student_private_notes RLS', () => {
  let fx: TwoTeacherFixture;
  let parent: SeededUser;

  const noteRowsFor = async (client: TwoTeacherFixture['service'], profileId: string) =>
    (await client.from('student_private_notes').select('notes').eq('profile_id', profileId)).data;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    parent = await createSignedInRlsUser(fx.service, 'student', 'notes-parent');
    const linked = await Promise.all([
      fx.service.from('profiles').update({ is_parent: true }).eq('id', parent.id),
      fx.service.from('profiles').update({ parent_id: parent.id }).eq('id', fx.studentA1.id),
    ]);
    const failed = linked.find((result) => result.error);
    if (failed?.error) throw new Error(`link parent failed: ${failed.error.message}`);

    const { error } = await fx.service
      .from('profiles')
      .update({ notes: NOTE })
      .eq('id', fx.studentA1.id);
    if (error) throw new Error(`seed note failed: ${error.message}`);
  }, 30_000);

  afterAll(async () => {
    // The parent link goes first so deleting the parent does not trip on the child.
    await fx?.service.from('profiles').update({ parent_id: null }).eq('id', fx.studentA1.id);
    await fx?.cleanup();
  });

  it('moves a note written to profiles.notes into student_private_notes', async () => {
    const { data } = await fx.service
      .from('profiles')
      .select('notes')
      .eq('id', fx.studentA1.id)
      .single();
    expect(data).toEqual({ notes: null });
    expect(await noteRowsFor(fx.service, fx.studentA1.id)).toEqual([{ notes: NOTE }]);
  });

  it('the teacher reads the note', async () => {
    expect(await noteRowsFor(fx.teacherA.client, fx.studentA1.id)).toEqual([{ notes: NOTE }]);
  });

  it('the student reads neither the note nor any trace of it on their own row', async () => {
    const own = await fx.studentA1.client
      .from('profiles')
      .select('id, notes')
      .eq('id', fx.studentA1.id)
      .single();
    expect(own.data).toEqual({ id: fx.studentA1.id, notes: null });
    expect(await noteRowsFor(fx.studentA1.client, fx.studentA1.id)).toEqual([]);
  });

  it("the parent sees the child's profile but not the note", async () => {
    const child = await parent.client
      .from('profiles')
      .select('id, notes')
      .eq('id', fx.studentA1.id)
      .single();
    expect(child.data).toEqual({ id: fx.studentA1.id, notes: null });
    expect(await noteRowsFor(parent.client, fx.studentA1.id)).toEqual([]);
  });

  it('nobody signed in writes the table directly', async () => {
    for (const client of [fx.teacherA.client, fx.studentA1.client, parent.client]) {
      const { error } = await client
        .from('student_private_notes')
        .insert({ profile_id: fx.studentB1.id, notes: 'injected' });
      expect(error).not.toBeNull();
    }
    expect(await noteRowsFor(fx.service, fx.studentB1.id)).toEqual([]);
  });

  it('the student cannot overwrite or clear the note through their own profile', async () => {
    for (const notes of ['rewritten by the student', '  ']) {
      // Refused by the profile guard or ignored by the notes trigger — either
      // way the stored note must not change.
      await fx.studentA1.client.from('profiles').update({ notes }).eq('id', fx.studentA1.id);
      expect(await noteRowsFor(fx.service, fx.studentA1.id)).toEqual([{ notes: NOTE }]);
    }
  });

  it('a blank value clears the note', async () => {
    const { error } = await fx.service
      .from('profiles')
      .update({ notes: '  ' })
      .eq('id', fx.studentA1.id);
    expect(error).toBeNull();
    expect(await noteRowsFor(fx.service, fx.studentA1.id)).toEqual([]);
  });
});
