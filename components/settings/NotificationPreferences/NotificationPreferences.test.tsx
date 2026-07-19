/**
 * Component tests: NotificationPreferences — unsubscribe affordance
 *
 * @see components/settings/NotificationPreferences/NotificationPreferences.tsx
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationPreferences from './NotificationPreferences';
import { useNotificationPreferences } from './useNotificationPreferences';
import type { NotificationPreference } from '@/types/notifications';

jest.mock('./useNotificationPreferences', () => ({
  useNotificationPreferences: jest.fn(),
}));

const mockUseNotificationPreferences = useNotificationPreferences as jest.Mock;

const makePreference = (
  type: NotificationPreference['notification_type'],
  enabled: boolean
): NotificationPreference => ({
  id: `pref-${type}`,
  user_id: 'user-123',
  notification_type: type,
  enabled,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('NotificationPreferences — unsubscribe affordance', () => {
  const toggleAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an unambiguous "Unsubscribe" link when all preferences are enabled', () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: [
        makePreference('lesson_reminder_24h', true),
        makePreference('lesson_recap', true),
      ],
      isLoading: false,
      error: null,
      togglePreference: jest.fn(),
      toggleAll,
    });

    render(<NotificationPreferences userId="user-123" />);

    expect(
      screen.getByRole('button', { name: /unsubscribe from all notifications/i })
    ).toBeInTheDocument();
  });

  it('calls updateAllNotificationPreferences(userId, false) via toggleAll when clicked', async () => {
    const user = userEvent.setup();
    mockUseNotificationPreferences.mockReturnValue({
      preferences: [makePreference('lesson_reminder_24h', true)],
      isLoading: false,
      error: null,
      togglePreference: jest.fn(),
      toggleAll,
    });

    render(<NotificationPreferences userId="user-123" />);

    await user.click(screen.getByRole('button', { name: /unsubscribe from all notifications/i }));

    expect(toggleAll).toHaveBeenCalledWith(false);
  });

  it('hides the unsubscribe link once preferences are already disabled', () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: [makePreference('lesson_reminder_24h', false)],
      isLoading: false,
      error: null,
      togglePreference: jest.fn(),
      toggleAll,
    });

    render(<NotificationPreferences userId="user-123" />);

    expect(
      screen.queryByRole('button', { name: /unsubscribe from all notifications/i })
    ).not.toBeInTheDocument();
  });
});
