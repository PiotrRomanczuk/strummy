/**
 * In-app notifications in Polish: rows written by the English generator are
 * rendered from their type, in both the bell dropdown and the inbox list.
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderPolish } from '@/lib/testing/intl-test-utils';
import type { InAppNotification } from '@/lib/services/in-app-notification-service';
import { NotificationBellItem } from './NotificationBell.Item';
import { NotificationRowItem } from './Notifications.List.Row';

const NOW = new Date('2026-11-24T12:00:00Z');

const completed = (overrides: Partial<InAppNotification> = {}): InAppNotification => ({
  id: 'n-1',
  profile_id: 'p-1',
  notification_type: 'assignment_completed',
  title: 'Assignment Completed',
  body: 'Emma Wright completed "E2E Interact Assignment"',
  icon: '✅',
  variant: 'success',
  is_read: false,
  read_at: null,
  action_url: '/dashboard/assignments/a-1',
  action_label: 'View Assignment',
  entity_type: null,
  entity_id: null,
  priority: 5,
  created_at: '2026-11-24T11:00:00Z',
  updated_at: '2026-11-24T11:00:00Z',
  expires_at: null,
  ...overrides,
});

describe('NotificationBellItem (pl)', () => {
  it('shows the translated title, body, action and time', () => {
    renderPolish(<NotificationBellItem notification={completed()} onMarkAsRead={jest.fn()} />);
    expect(screen.getByText('Zadanie wykonane')).toBeInTheDocument();
    expect(
      screen.getByText('Emma Wright: ukończono zadanie „E2E Interact Assignment”')
    ).toBeInTheDocument();
    expect(screen.getByText('Zobacz zadanie →')).toBeInTheDocument();
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
  });

  it('keeps text the generator did not write', () => {
    renderPolish(
      <NotificationBellItem
        notification={completed({ title: 'Kuba skończył zadanie', body: 'Czyste przejście.' })}
        onMarkAsRead={jest.fn()}
      />
    );
    expect(screen.getByText('Kuba skończył zadanie')).toBeInTheDocument();
    expect(screen.getByText('Czyste przejście.')).toBeInTheDocument();
  });
});

describe('NotificationRowItem (pl)', () => {
  it('shows the translated title and body in the inbox list', () => {
    renderPolish(
      <NotificationRowItem notification={completed()} now={NOW} isLast onMarkRead={jest.fn()} />
    );
    expect(screen.getByText('Zadanie wykonane')).toBeInTheDocument();
    expect(
      screen.getByText('Emma Wright: ukończono zadanie „E2E Interact Assignment”')
    ).toBeInTheDocument();
    expect(screen.getByText('1 godz. temu')).toBeInTheDocument();
  });

  it('writes the calendar date of an old notification the Polish way', () => {
    renderPolish(
      <NotificationRowItem
        notification={completed({ created_at: '2026-10-01T10:00:00Z' })}
        now={NOW}
        isLast
        onMarkRead={jest.fn()}
      />
    );
    expect(screen.getByText(/1 paź/)).toBeInTheDocument();
  });
});
