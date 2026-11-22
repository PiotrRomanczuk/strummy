import { addDays, dueOnFor, warsawToday } from '../billing-dates';
import { balanceState, toLedgerEntry } from '../student-billing.helpers';

describe('balanceState', () => {
  it('words credit, zero and lessons to pay for', () => {
    expect(balanceState(3)).toEqual({ kind: 'credit', lessons: 3 });
    expect(balanceState(0)).toEqual({ kind: 'zero' });
    expect(balanceState(-2)).toEqual({ kind: 'due', lessons: 2 });
  });
});

describe('toLedgerEntry', () => {
  const row = {
    id: 'e1',
    delta: -1,
    reason: 'lesson',
    created_at: '2026-11-14T10:00:00Z',
    note: null,
  };

  it('reads an embed returned as an object', () => {
    const entry = toLedgerEntry({
      ...row,
      lesson: { scheduled_at: '2026-11-13T16:00:00Z' },
      purchase: null,
    });
    expect(entry.lessonAt).toBe('2026-11-13T16:00:00Z');
    expect(entry.purchaseDescription).toBeNull();
  });

  it('reads an embed typed as an array', () => {
    const entry = toLedgerEntry({
      ...row,
      reason: 'purchase',
      delta: 4,
      lesson: [],
      purchase: [{ description: 'Karnet 4' }],
    });
    expect(entry.lessonAt).toBeNull();
    expect(entry.purchaseDescription).toBe('Karnet 4');
  });
});

describe('billing dates', () => {
  it('uses the Warsaw calendar day', () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Warsaw (UTC+1 in winter).
    expect(warsawToday(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01');
    expect(warsawToday(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10-31');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2026-02-26', 3)).toBe('2026-03-01');
  });

  it('puts the due date the payment term after today', () => {
    expect(dueOnFor(new Date('2026-11-14T12:00:00Z'), 7)).toBe('2026-11-21');
    expect(dueOnFor(new Date('2026-11-14T12:00:00Z'), 0)).toBe('2026-11-14');
  });
});
