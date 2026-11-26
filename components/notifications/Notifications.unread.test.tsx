import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { InAppNotification } from '@/lib/services/in-app-notification-service';
import { renderServerTree } from '@/lib/testing/intl-test-utils';

import { Notifications } from './Notifications';

jest.mock('@/app/actions/in-app-notifications', () => ({
  markAllNotificationsAsRead: jest.fn(),
  markNotificationAsRead: jest.fn(),
  getInAppNotifications: jest.fn(),
}));
jest.mock('./Notifications.List', () => ({ NotificationsList: () => null }));

const NOW = new Date('2026-11-24T12:00:00Z');

const row = (id: string, isRead: boolean): InAppNotification =>
  ({
    id,
    is_read: isRead,
    created_at: '2026-11-24T10:00:00Z',
  }) as InAppNotification;

describe('Notifications unread count', () => {
  it('shows the account-wide unread total, the same number the bell shows', async () => {
    await renderServerTree(
      <Notifications
        notifications={[row('a', false), row('b', false)]}
        userId="p1"
        now={NOW}
        unreadTotal={519}
      />
    );
    expect(screen.getByText(/519 unread/)).toBeInTheDocument();
  });

  it('counts the loaded rows when no total is given', async () => {
    await renderServerTree(
      <Notifications notifications={[row('a', false), row('b', true)]} userId="p1" now={NOW} />
    );
    expect(screen.getByText(/1 unread/)).toBeInTheDocument();
  });
});
