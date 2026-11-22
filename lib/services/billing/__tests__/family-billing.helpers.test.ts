import { formatBillingDay } from '../billing-dates';
import { openPurchases, summariseAccount } from '../family-billing.helpers';
import type { StudentPurchase } from '../student-billing.helpers';

const purchase = (overrides: Partial<StudentPurchase>): StudentPurchase => ({
  id: 'p',
  description: 'Karnet 4',
  lessonCount: 4,
  amountCents: 48000,
  status: 'pending',
  paymentMethod: null,
  paymentUrl: null,
  dueOn: '2026-11-21',
  paidAt: null,
  createdAt: '2026-11-14T10:00:00Z',
  ...overrides,
});

describe('openPurchases', () => {
  it('keeps unpaid packages, earliest due first, undated last', () => {
    const open = openPurchases([
      purchase({ id: 'late', dueOn: '2026-12-01' }),
      purchase({ id: 'paid', status: 'paid' }),
      purchase({ id: 'undated', dueOn: null }),
      purchase({ id: 'cancelled', status: 'cancelled' }),
      purchase({ id: 'early', dueOn: '2026-11-20' }),
    ]);
    expect(open.map((p) => p.id)).toEqual(['early', 'late', 'undated']);
  });
});

describe('summariseAccount', () => {
  it('is null when billing was never used — no card for that student', () => {
    expect(summariseAccount({ balance: 0, purchases: [], hasActivity: false })).toBeNull();
  });

  it('adds up what is due and picks the nearest due date', () => {
    expect(
      summariseAccount({
        balance: -2,
        hasActivity: true,
        purchases: [
          purchase({ amountCents: 48000, dueOn: '2026-11-28' }),
          purchase({ amountCents: 90000, dueOn: '2026-11-21' }),
          purchase({ amountCents: 1, status: 'paid' }),
        ],
      })
    ).toEqual({ balance: -2, openCount: 2, openAmountCents: 138000, nextDueOn: '2026-11-21' });
  });

  it('reports nothing due once everything is paid', () => {
    expect(
      summariseAccount({ balance: 3, hasActivity: true, purchases: [purchase({ status: 'paid' })] })
    ).toEqual({ balance: 3, openCount: 0, openAmountCents: 0, nextDueOn: null });
  });
});

describe('formatBillingDay', () => {
  it('keeps the calendar day whatever the time zone', () => {
    expect(formatBillingDay('2026-11-21', 'pl')).toBe('21.11.2026');
    expect(formatBillingDay('2026-01-01', 'en-US')).toBe('1/1/2026');
  });
});
