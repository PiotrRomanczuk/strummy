'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { InAppNotification } from '@/lib/services/in-app-notification-service';
import { VARIANT_COLOURS, formatRelative } from './notifications.helpers';

type RowProps = {
  notification: InAppNotification;
  now: Date;
  isLast: boolean;
  onMarkRead: (id: string) => void;
};

/** Single inbox row: icon dot, title/body (linked when `action_url` is
 * set), relative timestamp, and a "Mark read" action for unread rows. Split
 * out of Notifications.List.tsx to keep that file under the size limit. */
export const NotificationRowItem = ({ notification: n, now, isLast, onMarkRead }: RowProps) => {
  const t = useTranslations('Notifications');
  const accent = VARIANT_COLOURS[n.variant ?? 'default'] ?? VARIANT_COLOURS.default;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        gap: 14,
        padding: '16px 22px',
        borderBottom: isLast ? 'none' : '1px solid var(--rule)',
        background: n.is_read ? 'var(--card)' : 'rgba(200,149,35,.05)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--paper)',
          border: `1px solid ${accent}`,
          color: accent,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--serif)',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {n.icon ?? '·'}
      </div>
      {n.action_url ? (
        <Link
          href={n.action_url}
          onClick={() => {
            if (!n.is_read) onMarkRead(n.id);
          }}
          style={{ minWidth: 0, textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>{n.title}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5 }}>
            {n.body}
          </div>
        </Link>
      ) : (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>{n.title}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5 }}>
            {n.body}
          </div>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          alignSelf: 'flex-start',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
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
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--rule)',
              background: 'var(--card)',
              color: 'var(--ink-3)',
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
