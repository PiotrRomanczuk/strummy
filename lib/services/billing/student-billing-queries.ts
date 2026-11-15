import { getBillingSettings, getLessonPackages } from './billing-queries';
import { packagePriceCents } from './package-price';
import { getStudentAccount } from './student-account-queries';
import type { LedgerEntry, StudentPurchase } from './student-billing.helpers';

/** A package the teacher can sell to this student, priced for them. */
export type SellablePackage = { id: string; name: string; lessonCount: number; priceCents: number };

export type StudentBilling = {
  /** Lessons left; negative = lessons held and not paid for yet. */
  balance: number;
  /** False until the teacher sets a billing start date — held lessons are not counted yet. */
  isCounting: boolean;
  purchases: StudentPurchase[];
  ledger: LedgerEntry[];
  packages: SellablePackage[];
};

/** Everything the teacher's "Rozliczenia" tab shows for one student. */
export async function getStudentBilling(
  studentId: string,
  teacherProfileId: string
): Promise<StudentBilling> {
  const [account, packages, settings] = await Promise.all([
    getStudentAccount(studentId),
    getLessonPackages(teacherProfileId),
    getBillingSettings(teacherProfileId),
  ]);

  return {
    balance: account.balance,
    isCounting: settings.billingStartOn !== null,
    purchases: account.purchases,
    ledger: account.ledger,
    packages: packages
      .filter((pkg) => pkg.isActive)
      .map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        lessonCount: pkg.lessonCount,
        priceCents: packagePriceCents({
          lessonRate: account.lessonRate,
          lessonCount: pkg.lessonCount,
          priceCents: pkg.priceCents,
        }),
      })),
  };
}
