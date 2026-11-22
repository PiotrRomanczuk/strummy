import type { StudentPurchase } from './student-billing.helpers';

export type BillingSummary = {
  /** Lessons left; negative = lessons held and not paid for yet. */
  balance: number;
  /** Packages issued and not paid yet. */
  openCount: number;
  openAmountCents: number;
  /** The earliest due date among them, `YYYY-MM-DD`. */
  nextDueOn: string | null;
};

type AccountLike = { balance: number; purchases: StudentPurchase[]; hasActivity: boolean };

/** The packages still waiting for payment, oldest due date first. */
export const openPurchases = (purchases: StudentPurchase[]): StudentPurchase[] =>
  purchases
    .filter((purchase) => purchase.status === 'pending')
    .sort((a, b) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999'));

/**
 * What a home card says about billing. Null for a student whose teacher does
 * not use billing at all — a card saying "0 lessons" would only confuse them.
 */
export function summariseAccount(account: AccountLike): BillingSummary | null {
  if (!account.hasActivity) return null;
  const open = openPurchases(account.purchases);
  return {
    balance: account.balance,
    openCount: open.length,
    openAmountCents: open.reduce((sum, purchase) => sum + purchase.amountCents, 0),
    nextDueOn: open[0]?.dueOn ?? null,
  };
}
