'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { InAppNotification } from '@/lib/services/in-app-notification-service';
import { formatRelative } from './notifications.helpers';
import { NotificationKindIcon } from './Notifications.KindIcon';

type RowProps = {
  notification: InAppNotification;
  now: Date;
  isLast: boolean;
  onMarkRead: (id: string) => void;
};

/**
 * Claude Design activity row: kind tile, bold title over a muted context line,
 * time on the right. Unread rows carry a gold bar and a warm tint.
 */
export const NotificationRowItem = ({ notification: n, now, isLast, onMarkRead }: RowProps) => {
  const t = useTranslations('Notifications');
  const body = (
    <>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>
        {n.title}
      </div>
      {n.body && (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 3, lineHeight: 1.45 }}>
          {n.body}
        </div>
      )}
    </>
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '36px minmax(0,1fr) auto',
        gap: 14,
        padding: '14px 18px',
        borderBottom: isLast ? 'none' : '1px solid var(--rule)',
        borderLeft: `3px solid ${n.is_read ? 'transparent' : 'var(--gold-2)'}`,
        background: n.is_read
          ? 'transparent'
          : 'color-mix(in oklab, var(--gold-tint) 45%, var(--card))',
        alignItems: 'flex-start',
      }}
    >
      <NotificationKindIcon type={n.notification_type} variant={n.variant} />
      {n.action_url ? (
        <Link
          href={n.action_url}
          onClick={() => {
            if (!n.is_read) onMarkRead(n.id);
          }}
          style={{ minWidth: 0, textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          {body}
        </Link>
      ) : (
        <div style={{ minWidth: 0 }}>{body}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatRelative(n.created_at, now, t)}
        </span>
        {!n.is_read && (
          <button
            type="button"
            onClick={() => onMarkRead(n.id)}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-4)',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
            }}
          >
            {t('listMarkRead')}
          </button>
        )}
      </div>
    </div>
  );
};
