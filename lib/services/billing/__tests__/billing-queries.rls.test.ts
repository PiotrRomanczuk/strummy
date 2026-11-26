/**
 * The billing reads on the real dev stack, made by the people who make them:
 * the teacher on a student's "Rozliczenia" tab, the student and the parent on
 * their own billing page. RLS decides what each of them sees, so every read
 * here runs under that person's real session (`actAs`) — a mocked client
 * could only echo the filters back.
 *
 * Scenario: student A1 has lessons with teachers A and B. A sold one package
 * (paid, +4), has two unpaid and one cancelled; A's lesson was held (-1, made
 * by the balance trigger). B gave A1 two lessons by hand (+2) and has one
 * unpaid package. Student B1 (B's only) shares a parent with A1.
 */
import {
  actAs,
  createRlsUser,
  describeIfRls,
  seedRow,
  seedTwoTeachers,
  updateRow,
  type TwoTeacherFixture,
} from '@/lib/testing/rls';
import { getBillingSettings, getLessonPackages } from '../billing-queries';
import { getStudentBilling } from '../student-billing-queries';
import { getBillingSummary, getFamilyBilling } from '../family-billing-queries';

describeIfRls('billing queries on the real database', () => {
  let fx: TwoTeacherFixture;
  let parent: { email: string; password: string; userId: string };
  const pkg = { four: '', eight: '', retired: '', ten: '' };

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    const { service, teacherA, teacherB, studentA1, studentB1 } = fx;
    const tag = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const parentUser = await createRlsUser(service, 'student', `billing-parent-${tag}`, {
      is_student: false,
      is_parent: true,
    });
    parent = parentUser;
    await updateRow(service, 'profiles', studentA1.id, {
      lesson_rate: 110,
      parent_id: parentUser.id,
    });
    await updateRow(service, 'profiles', studentB1.id, { parent_id: parentUser.id });
    await seedRow(service, 'lessons', {
      teacher_id: teacherB.id,
      student_id: studentA1.id,
      title: 'RLS billing lesson with B',
      scheduled_at: new Date().toISOString(),
    });

    const packageOf = (
      teacher_id: string,
      name: string,
      lesson_count: number,
      price_cents: number,
      is_active = true
    ) =>
      seedRow(service, 'lesson_packages', {
        teacher_id,
        name,
        lesson_count,
        price_cents,
        is_active,
      });
    pkg.four = await packageOf(teacherA.id, 'RLS karnet 4', 4, 48000);
    pkg.eight = await packageOf(teacherA.id, 'RLS karnet 8', 8, 90000);
    pkg.retired = await packageOf(teacherA.id, 'RLS pojedyncza', 1, 15000, false);
    pkg.ten = await packageOf(teacherB.id, 'RLS karnet 10', 10, 100000);
    const settings = await service.from('billing_settings').insert({
      teacher_id: teacherA.id,
      billing_start_on: '2026-01-01',
      payment_term_days: 14,
    });
    if (settings.error) throw new Error(`seed billing_settings failed: ${settings.error.message}`);

    const purchase = (
      teacher_id: string,
      package_id: string,
      lesson_count: number,
      amount_cents: number,
      extra: Record<string, unknown>
    ) =>
      seedRow(service, 'package_purchases', {
        teacher_id,
        student_id: studentA1.id,
        payer_id: studentA1.id,
        package_id,
        description: 'RLS karnet',
        lesson_count,
        amount_cents,
        ...extra,
      });
    const paid = await purchase(teacherA.id, pkg.four, 4, 44000, {
      description: 'RLS karnet 4',
      status: 'paid',
      paid_at: '2026-11-01T10:00:00Z',
      payment_method: 'cash',
      due_on: '2026-11-05',
    });
    await purchase(teacherA.id, pkg.eight, 8, 88000, { due_on: '2026-12-20' });
    await purchase(teacherA.id, pkg.four, 4, 44000, { due_on: '2026-12-10' });
    await purchase(teacherA.id, pkg.four, 4, 44000, { status: 'cancelled', due_on: '2026-11-30' });
    await purchase(teacherB.id, pkg.ten, 10, 100000, { due_on: '2026-12-01' });

    await seedRow(service, 'lesson_credit_entries', {
      teacher_id: teacherA.id,
      student_id: studentA1.id,
      delta: 4,
      reason: 'purchase',
      purchase_id: paid,
      created_at: '2026-11-01T10:00:00Z',
    });
    await seedRow(service, 'lesson_credit_entries', {
      teacher_id: teacherB.id,
      student_id: studentA1.id,
      delta: 2,
      reason: 'manual',
      note: 'RLS gratis',
      created_at: '2026-11-02T10:00:00Z',
    });
    // The real balance trigger writes the -1 for a held lesson.
    await updateRow(service, 'lessons', fx.lessonA.id, { status: 'COMPLETED' });
  }, 60_000);

  afterAll(async () => {
    if (parent) await fx.service.auth.admin.deleteUser(parent.userId);
    await fx?.cleanup();
  });

  describe('as teacher A', () => {
    beforeAll(() => actAs(fx.teacherA));

    it('reads the own price list, packages on sale first, then by size', async () => {
      const list = await getLessonPackages(fx.teacherA.id);
      expect(list).toEqual([
        { id: pkg.four, name: 'RLS karnet 4', lessonCount: 4, priceCents: 48000, isActive: true },
        { id: pkg.eight, name: 'RLS karnet 8', lessonCount: 8, priceCents: 90000, isActive: true },
        {
          id: pkg.retired,
          name: 'RLS pojedyncza',
          lessonCount: 1,
          priceCents: 15000,
          isActive: false,
        },
      ]);
    });

    it('reads the own billing settings', async () => {
      await expect(getBillingSettings(fx.teacherA.id)).resolves.toEqual({
        billingStartOn: '2026-01-01',
        paymentTermDays: 14,
      });
    });

    it("sees only the own side of a shared student's account", async () => {
      const billing = await getStudentBilling(fx.studentA1.id, fx.teacherA.id);
      expect(billing.hasLoadError).toBe(false);
      expect(billing.balance).toBe(3); // +4 bought, -1 held; B's +2 is not A's to see
      expect(billing.isCounting).toBe(true);
      expect(billing.purchases.map((p) => p.status)).toEqual([
        'cancelled',
        'pending',
        'pending',
        'paid',
      ]);
      expect(billing.ledger.map((e) => [e.reason, e.delta])).toEqual([
        ['lesson', -1],
        ['purchase', 4],
      ]);
      expect(billing.ledger[0].lessonAt).not.toBeNull();
      expect(billing.ledger[1].purchaseDescription).toBe('RLS karnet 4');
    });

    it("offers only packages on sale, priced at the student's own rate", async () => {
      const { packages } = await getStudentBilling(fx.studentA1.id, fx.teacherA.id);
      expect(packages).toEqual([
        { id: pkg.four, name: 'RLS karnet 4', lessonCount: 4, priceCents: 44000 },
        { id: pkg.eight, name: 'RLS karnet 8', lessonCount: 8, priceCents: 88000 },
      ]);
    });
  });

  describe('as teacher B', () => {
    beforeAll(() => actAs(fx.teacherB));

    it("cannot read teacher A's price list or settings", async () => {
      await expect(getLessonPackages(fx.teacherA.id)).resolves.toEqual([]);
      await expect(getBillingSettings(fx.teacherA.id)).resolves.toEqual({
        billingStartOn: null,
        paymentTermDays: 7,
      });
    });

    it('gets the defaults while it has never saved settings, and does not count yet', async () => {
      const billing = await getStudentBilling(fx.studentA1.id, fx.teacherB.id);
      expect(billing.isCounting).toBe(false);
      expect(billing.balance).toBe(2);
      expect(billing.purchases).toHaveLength(1);
      expect(billing.packages).toEqual([
        { id: pkg.ten, name: 'RLS karnet 10', lessonCount: 10, priceCents: 110000 },
      ]);
    });
  });

  describe('as the student', () => {
    beforeAll(() => actAs(fx.studentA1));

    it('sees the whole account across both teachers and both price lists', async () => {
      const family = await getFamilyBilling(fx.studentA1.id);
      expect(family.balance).toBe(5);
      expect(family.purchases).toHaveLength(5);
      expect(family.lessonRate).toBe(110);
      expect(family.priceList.map((p) => [p.lessonCount, p.priceCents])).toEqual([
        [4, 44000],
        [8, 88000],
        [10, 110000],
      ]);
    });

    it('sums up the unpaid packages for the home card', async () => {
      await expect(getBillingSummary(fx.studentA1.id)).resolves.toEqual({
        balance: 5,
        openCount: 3,
        openAmountCents: 232000,
        nextDueOn: '2026-12-01',
      });
    });
  });

  describe('as the parent of both children', () => {
    beforeAll(() => actAs(parent));

    it("sees the child's account as the child does", async () => {
      const family = await getFamilyBilling(fx.studentA1.id);
      expect(family.balance).toBe(5);
      expect(family.purchases).toHaveLength(5);
    });

    it("shows one child only that child's teachers, though it may read both lists", async () => {
      const family = await getFamilyBilling(fx.studentB1.id);
      expect(family.priceList).toEqual([
        { id: pkg.ten, name: 'RLS karnet 10', lessonCount: 10, priceCents: 100000 },
      ]);
      await expect(getBillingSummary(fx.studentB1.id)).resolves.toBeNull();
    });
  });

  describe('as another student', () => {
    beforeAll(() => actAs(fx.studentB1));

    it("sees nothing of A1's account or teachers", async () => {
      const family = await getFamilyBilling(fx.studentA1.id);
      expect(family).toMatchObject({
        balance: 0,
        purchases: [],
        ledger: [],
        priceList: [],
        hasActivity: false,
      });
    });
  });
});
