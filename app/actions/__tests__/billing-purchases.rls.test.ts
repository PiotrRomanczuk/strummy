/**
 * Selling a package, recording its payment and withdrawing it — the real
 * server actions, called under real sessions (`actAs`), writing to the real
 * dev stack. The billing tables have no write policy, so the actions write
 * with the service role and their own checks are the whole access control:
 * every assertion reads the rows back with the service role.
 *
 * Replaces the mocked billing-purchases.test.ts, which could only check the
 * filters it was handed and simulated the duplicate-credit error by hand.
 *
 * @see app/actions/billing-purchases.ts
 */
import {
  actAs,
  actAsAnonymous,
  createRlsUser,
  describeIfRls,
  revalidatedPaths,
  seedRow,
  seedTwoTeachers,
  updateRow,
  type TwoTeacherFixture,
} from '@/lib/testing/rls';
import { TEST_ACCOUNT_MUTATION_ERROR } from '@/lib/auth/test-account-guard';
import { dueOnFor } from '@/lib/services/billing/billing-dates';
import {
  cancelPackagePurchase,
  createPackagePurchase,
  markPackagePurchasePaid,
} from '../billing-purchases';

type Login = { email: string; password: string; id: string; userId: string };

describeIfRls('billing purchase actions on the real database', () => {
  let fx: TwoTeacherFixture;
  let admin: Login;
  let demoTeacher: Login;
  const pkg = { four: '', retired: '', ten: '', admin: '' };

  const purchaseRow = async (id: string) => {
    const { data } = await fx.service.from('package_purchases').select('*').eq('id', id).single();
    return data as Record<string, unknown>;
  };
  const creditsFor = async (purchaseId: string) => {
    const { data } = await fx.service
      .from('lesson_credit_entries')
      .select('delta, reason, student_id, teacher_id')
      .eq('purchase_id', purchaseId);
    return data ?? [];
  };
  /** A sale teacher A made to student A1, still waiting for payment. */
  const pendingPurchase = () =>
    seedRow(fx.service, 'package_purchases', {
      teacher_id: fx.teacherA.id,
      student_id: fx.studentA1.id,
      payer_id: fx.studentA1.id,
      package_id: pkg.four,
      description: 'RLS karnet 4',
      lesson_count: 4,
      amount_cents: 48000,
    });

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    const { service, teacherA, teacherB } = fx;
    const tag = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    // Fixture users are demo accounts by default, which the test-account guard blocks.
    for (const user of [teacherA, teacherB, fx.studentA1]) {
      await updateRow(service, 'profiles', user.id, { is_development: false });
    }
    admin = await createRlsUser(service, 'admin', `billing-${tag}`, { is_development: false });
    demoTeacher = await createRlsUser(service, 'teacher', `billing-demo-${tag}`);

    const packageOf = (teacher_id: string, lesson_count: number, is_active = true) =>
      seedRow(service, 'lesson_packages', {
        teacher_id,
        name: `RLS karnet ${lesson_count}`,
        lesson_count,
        price_cents: lesson_count * 12000,
        is_active,
      });
    pkg.four = await packageOf(teacherA.id, 4);
    pkg.retired = await packageOf(teacherA.id, 1, false);
    pkg.ten = await packageOf(teacherB.id, 10);
    pkg.admin = await packageOf(admin.id, 2);
    const settings = await service
      .from('billing_settings')
      .insert({ teacher_id: teacherA.id, payment_term_days: 14 });
    if (settings.error) throw new Error(`seed billing_settings failed: ${settings.error.message}`);
  }, 60_000);

  afterAll(async () => {
    for (const user of [admin, demoTeacher]) {
      if (user) await fx.service.auth.admin.deleteUser(user.userId);
    }
    await fx?.cleanup();
  });

  describe('createPackagePurchase', () => {
    it('sells at the list price, fixed into the sale, due after the payment term', async () => {
      await actAs(fx.teacherA);
      const result = await createPackagePurchase({
        studentId: fx.studentA1.id,
        packageId: pkg.four,
      });
      if (!('purchaseId' in result)) throw new Error(result.error);

      expect(await purchaseRow(result.purchaseId)).toMatchObject({
        teacher_id: fx.teacherA.id,
        student_id: fx.studentA1.id,
        payer_id: fx.studentA1.id,
        package_id: pkg.four,
        description: 'RLS karnet 4',
        lesson_count: 4,
        amount_cents: 48000,
        status: 'pending',
        invoice_status: 'skipped',
        created_by: fx.teacherA.id,
        due_on: dueOnFor(new Date(), 14),
      });
      expect(revalidatedPaths).toContain(`/dashboard/users/${fx.studentA1.id}`);
    });

    it("prices by the student's own rate when there is one", async () => {
      await updateRow(fx.service, 'profiles', fx.studentA1.id, { lesson_rate: 100 });
      try {
        await actAs(fx.teacherA);
        const result = await createPackagePurchase({
          studentId: fx.studentA1.id,
          packageId: pkg.four,
        });
        if (!('purchaseId' in result)) throw new Error(result.error);
        expect(await purchaseRow(result.purchaseId)).toMatchObject({ amount_cents: 40000 });
      } finally {
        await updateRow(fx.service, 'profiles', fx.studentA1.id, { lesson_rate: null });
      }
    });

    it.each([
      ['a package taken off sale', () => pkg.retired, () => fx.studentA1.id, 'Package not found'],
      ["another teacher's package", () => pkg.ten, () => fx.studentA1.id, 'Package not found'],
      [
        'a student with no lesson together',
        () => pkg.four,
        () => fx.studentB1.id,
        'Student not found',
      ],
      [
        'a profile that is not a student',
        () => pkg.four,
        () => fx.teacherB.id,
        'Student not found',
      ],
    ])('refuses %s and writes nothing', async (_case, packageId, studentId, error) => {
      await actAs(fx.teacherA);
      await expect(
        createPackagePurchase({ studentId: studentId(), packageId: packageId() })
      ).resolves.toEqual({ error });
      const { count } = await fx.service
        .from('package_purchases')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId())
        .eq('package_id', packageId());
      expect(count).toBe(0);
    });

    it('lets an admin sell their own package to any student', async () => {
      await actAs(admin);
      const result = await createPackagePurchase({
        studentId: fx.studentB1.id,
        packageId: pkg.admin,
      });
      expect(result).toEqual({ purchaseId: expect.any(String) });
    });

    it.each([
      ['a student', () => actAs(fx.studentA1), 'Only teachers and admins can manage billing'],
      ['an anonymous visitor', async () => actAsAnonymous(), 'Unauthorized'],
      ['a demo teacher account', () => actAs(demoTeacher), TEST_ACCOUNT_MUTATION_ERROR],
    ])('refuses %s', async (_who, signIn, error) => {
      await signIn();
      await expect(
        createPackagePurchase({ studentId: fx.studentA1.id, packageId: pkg.four })
      ).resolves.toEqual({ error });
    });
  });

  describe('markPackagePurchasePaid', () => {
    it('marks the sale paid and credits its lessons once', async () => {
      const purchaseId = await pendingPurchase();
      await actAs(fx.teacherA);
      await expect(markPackagePurchasePaid({ purchaseId, method: 'cash' })).resolves.toEqual({
        purchaseId,
      });

      const row = await purchaseRow(purchaseId);
      expect(row).toMatchObject({ status: 'paid', payment_method: 'cash' });
      expect(row.paid_at).not.toBeNull();
      expect(await creditsFor(purchaseId)).toEqual([
        { delta: 4, reason: 'purchase', student_id: fx.studentA1.id, teacher_id: fx.teacherA.id },
      ]);
    });

    it('credits once when five clicks arrive at the same time', async () => {
      const purchaseId = await pendingPurchase();
      await actAs(fx.teacherA);
      const results = await Promise.all(
        Array.from({ length: 5 }, () => markPackagePurchasePaid({ purchaseId, method: 'transfer' }))
      );
      expect(results).toEqual(Array(5).fill({ purchaseId }));
      expect(await creditsFor(purchaseId)).toHaveLength(1);
    });

    it('treats a retry after success as done, crediting nothing more', async () => {
      const purchaseId = await pendingPurchase();
      await actAs(fx.teacherA);
      await markPackagePurchasePaid({ purchaseId, method: 'cash' });
      await expect(markPackagePurchasePaid({ purchaseId, method: 'other' })).resolves.toEqual({
        purchaseId,
      });
      expect(await purchaseRow(purchaseId)).toMatchObject({ payment_method: 'cash' });
      expect(await creditsFor(purchaseId)).toHaveLength(1);
    });

    it('refuses a cancelled sale without crediting it', async () => {
      const purchaseId = await pendingPurchase();
      await updateRow(fx.service, 'package_purchases', purchaseId, { status: 'cancelled' });
      await actAs(fx.teacherA);
      await expect(markPackagePurchasePaid({ purchaseId, method: 'cash' })).resolves.toEqual({
        error: 'Purchase is not awaiting payment',
      });
      expect(await creditsFor(purchaseId)).toEqual([]);
    });

    it("reports another teacher's sale as not found and leaves it untouched", async () => {
      const purchaseId = await pendingPurchase();
      await actAs(fx.teacherB);
      await expect(markPackagePurchasePaid({ purchaseId, method: 'cash' })).resolves.toEqual({
        error: 'Purchase not found',
      });
      expect(await purchaseRow(purchaseId)).toMatchObject({ status: 'pending', paid_at: null });
      expect(await creditsFor(purchaseId)).toEqual([]);
    });

    it('refuses a payment method a teacher cannot record by hand', async () => {
      const purchaseId = await pendingPurchase();
      await actAs(fx.teacherA);
      await expect(
        markPackagePurchasePaid({ purchaseId, method: 'infakt' as 'cash' })
      ).resolves.toEqual({ error: 'Invalid request' });
      expect(await purchaseRow(purchaseId)).toMatchObject({ status: 'pending' });
    });
  });

  describe('cancelPackagePurchase', () => {
    it('withdraws a sale still waiting for payment', async () => {
      const purchaseId = await pendingPurchase();
      await actAs(fx.teacherA);
      await expect(cancelPackagePurchase({ purchaseId })).resolves.toEqual({ purchaseId });
      expect(await purchaseRow(purchaseId)).toMatchObject({ status: 'cancelled' });
    });

    it('keeps a paid sale and its credit', async () => {
      const purchaseId = await pendingPurchase();
      await actAs(fx.teacherA);
      await markPackagePurchasePaid({ purchaseId, method: 'cash' });
      await expect(cancelPackagePurchase({ purchaseId })).resolves.toEqual({
        error: 'Purchase is not awaiting payment',
      });
      expect(await purchaseRow(purchaseId)).toMatchObject({ status: 'paid' });
      expect(await creditsFor(purchaseId)).toHaveLength(1);
    });

    it("cannot withdraw another teacher's sale", async () => {
      const purchaseId = await pendingPurchase();
      await actAs(fx.teacherB);
      await expect(cancelPackagePurchase({ purchaseId })).resolves.toEqual({
        error: 'Purchase is not awaiting payment',
      });
      expect(await purchaseRow(purchaseId)).toMatchObject({ status: 'pending' });
    });
  });
});
