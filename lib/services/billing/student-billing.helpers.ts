/**
 * Row shapes of the student billing tab and the mapping from database rows.
 * Free of server-only imports, so client components can import the types.
 */

export type PurchaseStatus = 'pending' | 'paid' | 'cancelled';
export type LedgerReason = 'purchase' | 'lesson' | 'manual' | 'refund';

export type StudentPurchase = {
  id: string;
  description: string;
  lessonCount: number;
  amountCents: number;
  status: PurchaseStatus;
  paymentMethod: string | null;
  /** inFakt's online payment link; null until an invoice with a link exists. */
  paymentUrl: string | null;
  dueOn: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type LedgerEntry = {
  id: string;
  delta: number;
  reason: LedgerReason;
  createdAt: string;
  /** The lesson's start for `lesson` entries. */
  lessonAt: string | null;
  /** The package's name for `purchase` entries. */
  purchaseDescription: string | null;
  note: string | null;
};

type PurchaseRow = {
  id: string;
  description: string;
  lesson_count: number;
  amount_cents: number;
  status: string;
  payment_method: string | null;
  payment_url: string | null;
  due_on: string | null;
  paid_at: string | null;
  created_at: string;
};

type LedgerRow = {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
  note: string | null;
  // PostgREST returns a many-to-one embed as an object; the generated client
  // types it as an array. Accept both.
  lesson: OneOf<{ scheduled_at: string }>;
  purchase: OneOf<{ description: string }>;
};

type OneOf<T> = T | T[] | null;
const one = <T>(value: OneOf<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

export const toPurchase = (row: PurchaseRow): StudentPurchase => ({
  id: row.id,
  description: row.description,
  lessonCount: row.lesson_count,
  amountCents: row.amount_cents,
  // The database constrains both columns to these values.
  status: row.status as PurchaseStatus,
  paymentMethod: row.payment_method,
  paymentUrl: row.payment_url,
  dueOn: row.due_on,
  paidAt: row.paid_at,
  createdAt: row.created_at,
});

export const toLedgerEntry = (row: LedgerRow): LedgerEntry => ({
  id: row.id,
  delta: row.delta,
  reason: row.reason as LedgerReason,
  createdAt: row.created_at,
  lessonAt: one(row.lesson)?.scheduled_at ?? null,
  purchaseDescription: one(row.purchase)?.description ?? null,
  note: row.note,
});

/** How the tab words a balance: lessons left, nothing left, or lessons to pay for. */
export type BalanceState =
  { kind: 'credit'; lessons: number } | { kind: 'zero' } | { kind: 'due'; lessons: number };

export const balanceState = (balance: number): BalanceState => {
  if (balance > 0) return { kind: 'credit', lessons: balance };
  if (balance < 0) return { kind: 'due', lessons: -balance };
  return { kind: 'zero' };
};
