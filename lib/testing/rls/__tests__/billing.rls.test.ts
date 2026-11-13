/**
 * RLS acceptance tests for the billing tables (migration 20261113100000):
 * `lesson_packages`, `package_purchases`, `lesson_credit_entries`,
 * `billing_settings`, `billing_customers`.
 *
 * The lesson balance is money. Everyone reads only their own side of it, a
 * parent reads the child's, and nobody signed in can write any of it — every
 * write goes through the service role.
 */

import {
  createSignedInRlsUser,
  describeIfRls,
  seedTwoTeachers,
  type SeededUser,
  type TwoTeacherFixture,
} from '../index';

describeIfRls('billing tables RLS', () => {
  let fx: TwoTeacherFixture;
  let parent: SeededUser;
  let stranger: SeededUser;
  let packageId: string;
  let purchaseId: string;

  const idsOf = (rows: { id: string }[] | null) => (rows ?? []).map((row) => row.id);

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    parent = await createSignedInRlsUser(fx.service, 'student', 'billing-parent');
    stranger = await createSignedInRlsUser(fx.service, 'student', 'billing-stranger');
    const { error: parentError } = await fx.service
      .from('profiles')
      .update({ parent_id: parent.id })
      .eq('id', fx.studentA1.id);
    if (parentError) throw new Error(`link parent failed: ${parentError.message}`);

    const pkg = await fx.service
      .from('lesson_packages')
      .insert({
        teacher_id: fx.teacherA.id,
        name: 'RLS karnet 4',
        lesson_count: 4,
        price_cents: 48000,
      })
      .select('id')
      .single();
    if (pkg.error || !pkg.data) throw new Error(`seed package failed: ${pkg.error?.message}`);
    packageId = pkg.data.id;

    const purchase = await fx.service
      .from('package_purchases')
      .insert({
        teacher_id: fx.teacherA.id,
        student_id: fx.studentA1.id,
        payer_id: fx.studentA1.id,
        package_id: packageId,
        description: 'RLS karnet 4',
        lesson_count: 4,
        amount_cents: 48000,
      })
      .select('id')
      .single();
    if (purchase.error || !purchase.data) {
      throw new Error(`seed purchase failed: ${purchase.error?.message}`);
    }
    purchaseId = purchase.data.id;

    const seeded = await Promise.all([
      fx.service.from('lesson_credit_entries').insert({
        teacher_id: fx.teacherA.id,
        student_id: fx.studentA1.id,
        delta: 4,
        reason: 'purchase',
        purchase_id: purchaseId,
      }),
      fx.service
        .from('billing_settings')
        .insert({ teacher_id: fx.teacherA.id, billing_start_on: '2026-11-01' }),
      fx.service
        .from('billing_customers')
        .insert({ profile_id: fx.studentA1.id, infakt_client_id: `rls-${fx.studentA1.id}` }),
    ]);
    const failed = seeded.find((result) => result.error);
    if (failed?.error) throw new Error(`seed billing rows failed: ${failed.error.message}`);
  }, 30_000);

  afterAll(async () => {
    // Rows cascade from the fixture's profiles; the parent link must go first
    // so deleting the parent does not trip on the child.
    await fx?.service.from('profiles').update({ parent_id: null }).eq('id', fx.studentA1.id);
    await fx?.cleanup();
  });

  it('the teacher reads their own price list, purchases, ledger and settings', async () => {
    const client = fx.teacherA.client;
    expect(idsOf((await client.from('lesson_packages').select('id')).data)).toContain(packageId);
    expect(idsOf((await client.from('package_purchases').select('id')).data)).toContain(purchaseId);
    expect((await client.from('lesson_credit_entries').select('delta')).data).toEqual([
      { delta: 4 },
    ]);
    expect((await client.from('billing_settings').select('teacher_id')).data).toEqual([
      { teacher_id: fx.teacherA.id },
    ]);
  });

  it("another teacher reads none of this teacher's billing", async () => {
    const client = fx.teacherB.client;
    expect((await client.from('lesson_packages').select('id')).data).toEqual([]);
    expect((await client.from('package_purchases').select('id')).data).toEqual([]);
    expect((await client.from('lesson_credit_entries').select('id')).data).toEqual([]);
    expect((await client.from('billing_settings').select('teacher_id')).data).toEqual([]);
  });

  it('the student reads their purchase, their ledger and the price list of their teacher', async () => {
    const client = fx.studentA1.client;
    expect(idsOf((await client.from('package_purchases').select('id')).data)).toEqual([purchaseId]);
    expect((await client.from('lesson_credit_entries').select('delta')).data).toEqual([
      { delta: 4 },
    ]);
    expect(idsOf((await client.from('lesson_packages').select('id')).data)).toEqual([packageId]);
    expect((await client.from('billing_customers').select('profile_id')).data).toEqual([
      { profile_id: fx.studentA1.id },
    ]);
  });

  it("a student of another teacher reads nothing of this student's billing", async () => {
    for (const client of [fx.studentB1.client, stranger.client]) {
      expect((await client.from('package_purchases').select('id')).data).toEqual([]);
      expect((await client.from('lesson_credit_entries').select('id')).data).toEqual([]);
      expect((await client.from('lesson_packages').select('id')).data).toEqual([]);
      expect((await client.from('billing_customers').select('profile_id')).data).toEqual([]);
      expect((await client.from('billing_settings').select('teacher_id')).data).toEqual([]);
    }
  });

  it("a parent reads the child's purchase and ledger", async () => {
    const client = parent.client;
    expect(idsOf((await client.from('package_purchases').select('id')).data)).toEqual([purchaseId]);
    expect((await client.from('lesson_credit_entries').select('delta')).data).toEqual([
      { delta: 4 },
    ]);
    expect(idsOf((await client.from('lesson_packages').select('id')).data)).toEqual([packageId]);
  });

  it('a student CANNOT credit themselves or mark a purchase paid', async () => {
    const client = fx.studentA1.client;
    const { error: creditError } = await client.from('lesson_credit_entries').insert({
      teacher_id: fx.teacherA.id,
      student_id: fx.studentA1.id,
      delta: 10,
      reason: 'manual',
    });
    expect(creditError).not.toBeNull();

    await client
      .from('package_purchases')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', purchaseId);
    const { data } = await fx.service
      .from('package_purchases')
      .select('status')
      .eq('id', purchaseId)
      .single();
    expect(data?.status).toBe('pending');

    const { data: ledger } = await fx.service
      .from('lesson_credit_entries')
      .select('delta')
      .eq('student_id', fx.studentA1.id);
    expect(ledger).toEqual([{ delta: 4 }]);
  });

  it('a teacher CANNOT write billing rows directly either', async () => {
    const client = fx.teacherA.client;
    const { error: packageError } = await client.from('lesson_packages').insert({
      teacher_id: fx.teacherA.id,
      name: 'direct',
      lesson_count: 1,
      price_cents: 1,
    });
    expect(packageError).not.toBeNull();

    const { error: customerError } = await client
      .from('billing_customers')
      .insert({ profile_id: fx.teacherA.id, infakt_client_id: `rls-direct-${fx.teacherA.id}` });
    expect(customerError).not.toBeNull();

    await client.from('lesson_credit_entries').delete().eq('purchase_id', purchaseId);
    const { data } = await fx.service
      .from('lesson_credit_entries')
      .select('id')
      .eq('purchase_id', purchaseId);
    expect(data).toHaveLength(1);
  });

  it('the ledger refuses a second credit for the same purchase', async () => {
    const { error } = await fx.service.from('lesson_credit_entries').insert({
      teacher_id: fx.teacherA.id,
      student_id: fx.studentA1.id,
      delta: 4,
      reason: 'purchase',
      purchase_id: purchaseId,
    });
    expect(error?.code).toBe('23505');
  });
});
