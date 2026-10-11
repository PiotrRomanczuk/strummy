'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { getInAppNotifications, markNotificationAsRead } from '@/app/actions/in-app-notifications';
import type { InAppNotification } from '@/lib/services/in-app-notification-service';
import { kindMeta, type NotificationCategory } from './Notifications.KindIcon';
import { NotificationRowItem } from './Notifications.List.Row';

const FILTERS = ['all', 'lessons', 'practice', 'system'] as const;
type Filter = 'all' | NotificationCategory;
const FILTER_LABEL: Record<Filter, string> = {
  all: 'filterAll',
  lessons: 'filterLessons',
  practice: 'filterPractice',
  system: 'filterSystem',
};

type Props = {
  initialNotifications: InAppNotification[];
  userId: string;
  now: Date;
  pageSize: number;
  /** Rendered between the filter chips and the rows (the daily digest). */
  header?: ReactNode;
};

/**
 * Renders the notification rows plus a "Load more" control that appends
 * additional pages fetched via `getInAppNotifications`. Re-syncs from
 * `initialNotifications` when it changes (e.g. after "mark all read"
 * revalidates the parent server component with fresh data).
 */
export const NotificationsList = ({
  initialNotifications,
  userId,
  now,
  pageSize,
  header,
}: Props) => {
  const t = useTranslations('Notifications');
  const [notifications, setNotifications] = useState(initialNotifications);
  const [offset, setOffset] = useState(initialNotifications.length);
  const [hasMore, setHasMore] = useState(initialNotifications.length === pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

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

  const shown =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => kindMeta(n.notification_type, n.variant).category === filter);

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '10px 16px',
          overflowX: 'auto',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={isActive}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 12px',
                borderRadius: 99,
                border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule)'}`,
                background: isActive ? 'var(--ink)' : 'var(--card)',
                color: isActive ? 'var(--paper)' : 'var(--ink-3)',
                fontSize: 12,
                flex: '0 0 auto',
                fontWeight: isActive ? 500 : 400,
                cursor: 'pointer',
              }}
            >
              {t(FILTER_LABEL[f])}
            </button>
          );
        })}
      </div>
      {header && <div style={{ padding: '14px 16px 4px' }}>{header}</div>}
      {shown.length === 0 && (
        <div
          style={{
            padding: '28px 24px',
            textAlign: 'center',
            color: 'var(--ink-4)',
            fontStyle: 'italic',
            fontFamily: 'var(--serif)',
          }}
        >
          {t('filterEmpty')}
        </div>
      )}
      {shown.map((n, i) => (
        <NotificationRowItem
          key={n.id}
          notification={n}
          now={now}
          isLast={i === shown.length - 1 && !hasMore}
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
