/**
 * Component tests: NotificationsEditorialList "Load more" pagination
 *
 * @see components/notifications/editorial/NotificationsEditorial.List.tsx
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsEditorialList } from './NotificationsEditorial.List';
import { getInAppNotifications, markNotificationAsRead } from '@/app/actions/in-app-notifications';
import type { InAppNotification } from '@/lib/services/in-app-notification-service';

jest.mock('@/app/actions/in-app-notifications', () => ({
  getInAppNotifications: jest.fn(),
  markNotificationAsRead: jest.fn().mockResolvedValue(true),
}));

const mockGetMore = getInAppNotifications as jest.Mock;
const USER_ID = 'user-1';

const makeNotification = (id: string, isRead = false): InAppNotification =>
  ({
    id,
    user_id: USER_ID,
    notification_type: 'lesson_reminder_24h',
    title: `Notification ${id}`,
    body: `Body ${id}`,
    icon: null,
    variant: 'default',
    action_url: null,
    action_label: null,
    entity_type: null,
    entity_id: null,
    priority: 5,
    is_read: isRead,
    read_at: null,
    created_at: '2026-07-19T00:00:00Z',
    updated_at: '2026-07-19T00:00:00Z',
    expires_at: null,
  }) as InAppNotification;

const NOW = new Date('2026-07-19T12:00:00Z');

describe('NotificationsEditorialList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the empty state when there are no notifications', () => {
    render(
      <NotificationsEditorialList
        initialNotifications={[]}
        userId={USER_ID}
        now={NOW}
        pageSize={2}
      />
    );

    expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
  });

  it('does not show "Load more" when the initial page is smaller than pageSize', () => {
    render(
      <NotificationsEditorialList
        initialNotifications={[makeNotification('1')]}
        userId={USER_ID}
        now={NOW}
        pageSize={2}
      />
    );

    expect(screen.getByText('Notification 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
  });

  it('shows "Load more" when the initial page is full, and appends the next page on click', async () => {
    const user = userEvent.setup();
    mockGetMore.mockResolvedValueOnce([makeNotification('3')]);

    render(
      <NotificationsEditorialList
        initialNotifications={[makeNotification('1'), makeNotification('2')]}
        userId={USER_ID}
        now={NOW}
        pageSize={2}
      />
    );

    const loadMoreButton = screen.getByRole('button', { name: /Load more/i });
    expect(loadMoreButton).toBeInTheDocument();

    await user.click(loadMoreButton);

    expect(mockGetMore).toHaveBeenCalledWith(USER_ID, { limit: 2, offset: 2 });
    await waitFor(() => expect(screen.getByText('Notification 3')).toBeInTheDocument());

    // Next page only had 1 row (< pageSize), so "Load more" should disappear.
    expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
  });

  it('keeps "Load more" visible and requests the next offset when a full page is returned', async () => {
    const user = userEvent.setup();
    mockGetMore.mockResolvedValueOnce([makeNotification('3'), makeNotification('4')]);

    render(
      <NotificationsEditorialList
        initialNotifications={[makeNotification('1'), makeNotification('2')]}
        userId={USER_ID}
        now={NOW}
        pageSize={2}
      />
    );

    await user.click(screen.getByRole('button', { name: /Load more/i }));

    await waitFor(() => expect(screen.getByText('Notification 4')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Load more/i })).toBeInTheDocument();
  });

  it('shows an error message and keeps "Load more" visible when the fetch fails', async () => {
    const user = userEvent.setup();
    mockGetMore.mockRejectedValueOnce(new Error('network error'));

    render(
      <NotificationsEditorialList
        initialNotifications={[makeNotification('1'), makeNotification('2')]}
        userId={USER_ID}
        now={NOW}
        pageSize={2}
      />
    );

    await user.click(screen.getByRole('button', { name: /Load more/i }));

    await waitFor(() =>
      expect(screen.getByText(/Failed to load more notifications/i)).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /Load more/i })).toBeInTheDocument();
  });

  it('marks a row read on click without waiting for a page reload', async () => {
    const user = userEvent.setup();
    render(
      <NotificationsEditorialList
        initialNotifications={[makeNotification('1')]}
        userId={USER_ID}
        now={NOW}
        pageSize={2}
      />
    );

    await user.click(screen.getByRole('button', { name: /Mark read/i }));

    expect(markNotificationAsRead).toHaveBeenCalledWith('1');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Mark read/i })).not.toBeInTheDocument()
    );
  });
});
