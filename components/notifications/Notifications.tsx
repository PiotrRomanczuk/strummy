import { Check, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { markAllNotificationsAsRead } from '@/app/actions/in-app-notifications';
import type { InAppNotification } from '@/lib/services/in-app-notification-service';
import { NotificationsList } from './Notifications.List';

export const NOTIFICATIONS_PAGE_SIZE = 30;

type Props = {
  notifications: InAppNotification[];
  userId: string;
  now: Date;
};

const DAY_MS = 86_400_000;

/** Dark "Daily digest" strip: unread, today, this week. */
const Digest = ({ stats, t }: { stats: [number, string][]; t: (k: string) => string }) => (
  <div
    style={{
      background: 'var(--ink)',
      color: 'var(--paper)',
      borderRadius: 12,
      padding: '16px 18px',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--serif)',
        fontSize: 17,
        marginBottom: 10,
      }}
    >
      <Sparkles size={15} color="var(--gold)" aria-hidden="true" /> {t('digestTitle')}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {stats.map(([value, label], i) => (
        <div key={label}>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 24,
              lineHeight: 1.1,
              color: i === 0 ? 'var(--gold)' : 'var(--paper)',
            }}
          >
            {value}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-5)' }}>{label}</div>
        </div>
      ))}
    </div>
  </div>
);

/** Claude Design activity feed: title + mark-all, daily digest, filter chips, rows. */
export const Notifications = async ({ notifications, userId, now }: Props) => {
  const t = await getTranslations('Notifications');
  const unread = notifications.filter((n) => !n.is_read).length;
  const since = (ms: number) =>
    notifications.filter((n) => now.getTime() - Date.parse(n.created_at) < ms).length;

  async function markAllReadAction() {
    'use server';
    await markAllNotificationsAsRead(userId);
  }

  return (
    <div
      className="ui-dash-page"
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            paddingTop: 8,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--serif)',
                fontWeight: 400,
                fontSize: 28,
                letterSpacing: '-0.02em',
              }}
            >
              {t('activityTitle')}
            </h1>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              {unread === 0
                ? t('listAllCaughtUp')
                : `${unread} ${t(unread === 1 ? 'listUnreadSingular' : 'listUnreadPlural')}`}
            </div>
          </div>
          {unread > 0 && (
            <form action={markAllReadAction}>
              <button
                type="submit"
                aria-label={t('listMarkAllRead')}
                title={t('listMarkAllRead')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid var(--rule)',
                  background: 'var(--card)',
                  color: 'var(--ink-2)',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <Check size={16} />
              </button>
            </form>
          )}
        </div>

        <div className="ui-notif-card">
          <NotificationsList
            initialNotifications={notifications}
            userId={userId}
            now={now}
            pageSize={NOTIFICATIONS_PAGE_SIZE}
            header={
              notifications.length > 0 ? (
                <Digest
                  t={t}
                  stats={[
                    [unread, t('digestUnread')],
                    [since(DAY_MS), t('digestToday')],
                    [since(7 * DAY_MS), t('digestWeek')],
                  ]}
                />
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
};
