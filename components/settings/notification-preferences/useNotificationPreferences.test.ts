import { act, renderHook, waitFor } from '@testing-library/react';

import { useNotificationPreferences } from './useNotificationPreferences';

const mockGet = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/app/actions/notification-preferences', () => ({
  getUserNotificationPreferences: (...args: unknown[]) => mockGet(...args),
  updateNotificationPreference: (...args: unknown[]) => mockUpdate(...args),
  updateAllNotificationPreferences: jest.fn(),
}));

const pref = (enabled: boolean) => ({
  id: 'p1',
  profile_id: 'u1',
  notification_type: 'assignment_created',
  enabled,
});

/** A promise the test resolves by hand, to order responses deliberately. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe('useNotificationPreferences — stale loads', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockUpdate.mockReset().mockResolvedValue({ success: true });
  });

  it('ignores a load that resolves after the user has toggled', async () => {
    const first = deferred<{ success: boolean; data: unknown[] }>();
    mockGet.mockResolvedValueOnce({ success: true, data: [pref(true)] });
    const { result } = renderHook(() => useNotificationPreferences('u1'));
    await waitFor(() => expect(result.current.preferences).toHaveLength(1));

    // A refresh starts, then the user switches the preference off.
    mockGet.mockReturnValueOnce(first.promise);
    act(() => {
      void result.current.refresh();
    });
    await act(async () => {
      await result.current.togglePreference('assignment_created' as never, false);
    });
    expect(result.current.preferences[0].enabled).toBe(false);

    // The refresh answers late with the pre-toggle value: it must be ignored.
    await act(async () => first.resolve({ success: true, data: [pref(true)] }));
    expect(result.current.preferences[0].enabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
