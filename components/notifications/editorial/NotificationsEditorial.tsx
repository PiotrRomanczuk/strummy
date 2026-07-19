import { markAllNotificationsAsRead } from '@/app/actions/in-app-notifications';
import type { InAppNotification } from '@/lib/services/in-app-notification-service';
import { NotificationsEditorialList } from './NotificationsEditorial.List';

export const NOTIFICATIONS_PAGE_SIZE = 30;

type Props = {
  notifications: InAppNotification[];
  userId: string;
  now: Date;
};

export const NotificationsEditorial = ({ notifications, userId, now }: Props) => {
  const unread = notifications.filter((n) => !n.is_read).length;

  async function markAllReadAction() {
    'use server';
    await markAllNotificationsAsRead(userId);
  }

  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '32px 32px 64px',
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '.16em',
              }}
            >
              Inbox
            </div>
            <h1
              style={{
                margin: '4px 0 4px',
                fontFamily: 'var(--serif)',
                fontWeight: 400,
                fontSize: 44,
                letterSpacing: '-0.02em',
                fontStyle: 'italic',
              }}
            >
              Notifications
            </h1>
            <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
              {unread === 0 ? (
                <>All caught up.</>
              ) : (
                <>
                  <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{unread}</strong>{' '}
                  unread
                </>
              )}
            </div>
          </div>
          {unread > 0 && (
            <form action={markAllReadAction}>
              <button
                type="submit"
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--rule)',
                  background: 'var(--card)',
                  color: 'var(--ink-2)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                }}
              >
                Mark all read
              </button>
            </form>
          )}
        </div>

        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--rule)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <NotificationsEditorialList
            initialNotifications={notifications}
            userId={userId}
            now={now}
            pageSize={NOTIFICATIONS_PAGE_SIZE}
          />
        </div>
      </div>
    </div>
  );
};
