'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { getInAppNotifications, markNotificationAsRead } from '@/app/actions/in-app-notifications';
import type { InAppNotification } from '@/lib/services/in-app-notification-service';
import { NotificationRowItem } from './Notifications.List.Row';

type Props = {
  initialNotifications: InAppNotification[];
  userId: string;
  now: Date;
  pageSize: number;
};

/**
 * Renders the notification rows plus a "Load more" control that appends
 * additional pages fetched via `getInAppNotifications`. Re-syncs from
 * `initialNotifications` when it changes (e.g. after "mark all read"
 * revalidates the parent server component with fresh data).
 */
export const NotificationsList = ({ initialNotifications, userId, now, pageSize }: Props) => {
  const t = useTranslations('Notifications');
  const [notifications, setNotifications] = useState(initialNotifications);
  const [offset, setOffset] = useState(initialNotifications.length);
  const [hasMore, setHasMore] = useState(initialNotifications.length === pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotifications(initialNotifications);
    setOffset(initialNotifications.length);
    setHasMore(initialNotifications.length === pageSize);
  }, [initialNotifications, pageSize]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    setError(null);

    try {
      const nextPage = await getInAppNotifications(userId, { limit: pageSize, offset });
      setNotifications((prev) => [...prev, ...nextPage]);
      setOffset((prev) => prev + nextPage.length);
      setHasMore(nextPage.length === pageSize);
    } catch {
      setError(t('listLoadError'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await markNotificationAsRead(id);
  };

  if (notifications.length === 0) {
    return (
      <div
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--ink-4)',
          fontStyle: 'italic',
          fontFamily: 'var(--serif)',
          fontSize: 15,
        }}
      >
        {t('listEmptyState')}
      </div>
    );
  }

  return (
    <>
      {notifications.map((n, i) => (
        <NotificationRowItem
          key={n.id}
          notification={n}
          now={now}
          isLast={i === notifications.length - 1 && !hasMore}
          onMarkRead={handleMarkRead}
        />
      ))}

      {hasMore && (
        <div style={{ padding: '16px 22px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--rule)',
              background: 'var(--card)',
              color: 'var(--ink-2)',
              fontSize: 12,
              cursor: isLoadingMore ? 'default' : 'pointer',
              fontFamily: 'var(--sans)',
              opacity: isLoadingMore ? 0.6 : 1,
            }}
          >
            {isLoadingMore ? t('listLoadingMore') : t('listLoadMore')}
          </button>
          {error && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
        </div>
      )}
    </>
  );
};
