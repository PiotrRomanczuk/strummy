/**
 * RLS acceptance tests for `assignment_templates` (PR C, migration 20260720000002).
 *
 * Teachers own their templates; the policies scope every verb to
 * teacher_id = current_profile_id() (or admin). Proves a teacher cannot read
 * or write another teacher's templates.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

type Seeded = { id: string };

describeIfRls('assignment_templates RLS — teacher ownership isolation', () => {
  let fx: TwoTeacherFixture;
  let templateA: Seeded;
  let templateB: Seeded;

  const insertTemplate = async (teacherId: string): Promise<Seeded> => {
    const { data, error } = await fx.service
      .from('assignment_templates')
      .insert({ teacher_id: teacherId, title: 'RLS template fixture', description: null })
      .select('id')
      .single();
    if (error || !data) throw new Error(`insertTemplate failed: ${error?.message ?? 'no row'}`);
    return data as Seeded;
  };

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    templateA = await insertTemplate(fx.teacherA.id);
    templateB = await insertTemplate(fx.teacherB.id);
  }, 30_000);

  afterAll(async () => {
    await fx?.cleanup();
  });

  it('teacher sees their own template', async () => {
    const { data, error } = await fx.teacherA.client
      .from('assignment_templates')
      .select('id')
      .eq('id', templateA.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(templateA.id);
  });

  it("teacher CANNOT see another teacher's template", async () => {
    const { data, error } = await fx.teacherA.client
      .from('assignment_templates')
      .select('id')
      .eq('id', templateB.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("teacher CANNOT update another teacher's template", async () => {
    await fx.teacherA.client
      .from('assignment_templates')
      .update({ title: 'hijacked' })
      .eq('id', templateB.id);

    const { data } = await fx.service
      .from('assignment_templates')
      .select('title')
      .eq('id', templateB.id)
      .single();
    expect(data?.title).toBe('RLS template fixture');
  });

  it('teacher CAN update their own template', async () => {
    const { error } = await fx.teacherA.client
      .from('assignment_templates')
      .update({ title: 'renamed' })
      .eq('id', templateA.id);
    expect(error).toBeNull();

    const { data } = await fx.service
      .from('assignment_templates')
      .select('title')
      .eq('id', templateA.id)
      .single();
    expect(data?.title).toBe('renamed');
  });
});
