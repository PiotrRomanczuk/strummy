import { sweepShadowClaimReconciles } from '../shadow-claim-reconcile-sweep';

const mockReconcile = jest.fn();
jest.mock('@/lib/services/calendar-reconcile', () => ({
  reconcileCalendarForStudent: (...args: unknown[]) => mockReconcile(...args),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

const eventsLimit = jest.fn();
const updateEq = jest.fn();
const adminFrom = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: adminFrom })),
}));

const EVENT = {
  id: 'ev-1',
  user_id: 'user-1',
  metadata: { shadow_profile_id: 'shadow-1', transfer_counts: { lessons_student: 2 } },
};

beforeEach(() => {
  jest.clearAllMocks();
  eventsLimit.mockResolvedValue({ data: [EVENT], error: null });
  updateEq.mockResolvedValue({ error: null });
  mockReconcile.mockResolvedValue({ reconciled: 1, failed: 0, skipped: 0 });
  adminFrom.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        gte: () => ({ is: () => ({ order: () => ({ limit: eventsLimit }) }) }),
      }),
    }),
    update: () => ({ eq: updateEq }),
  }));
});

describe('sweepShadowClaimReconciles', () => {
  it('reconciles each unprocessed shadow_link_completed event and stamps it', async () => {
    const res = await sweepShadowClaimReconciles();
    expect(res).toEqual({ scanned: 1, reconciled: 1, failed: 0 });
    expect(mockReconcile).toHaveBeenCalledWith('user-1');
    expect(updateEq).toHaveBeenCalledWith('id', 'ev-1');
  });

  it('leaves the event unstamped on PARTIAL reconcile failure so failed lessons retry', async () => {
    mockReconcile.mockResolvedValue({ reconciled: 1, failed: 1, skipped: 0 });
    const res = await sweepShadowClaimReconciles();
    expect(res).toEqual({ scanned: 1, reconciled: 0, failed: 1 });
    expect(updateEq).not.toHaveBeenCalled();
  });

  it('leaves the event unstamped when reconcile throws so the next sweep retries', async () => {
    mockReconcile.mockRejectedValue(new Error('Google 500'));
    const res = await sweepShadowClaimReconciles();
    expect(res).toEqual({ scanned: 1, reconciled: 0, failed: 1 });
    expect(updateEq).not.toHaveBeenCalled();
  });

  it('returns zeros when the event query fails', async () => {
    eventsLimit.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await sweepShadowClaimReconciles();
    expect(res).toEqual({ scanned: 0, reconciled: 0, failed: 0 });
    expect(mockReconcile).not.toHaveBeenCalled();
  });

  it('skips events with no user_id', async () => {
    eventsLimit.mockResolvedValue({ data: [{ ...EVENT, user_id: null }], error: null });
    const res = await sweepShadowClaimReconciles();
    expect(res).toEqual({ scanned: 1, reconciled: 0, failed: 0 });
    expect(mockReconcile).not.toHaveBeenCalled();
  });
});
