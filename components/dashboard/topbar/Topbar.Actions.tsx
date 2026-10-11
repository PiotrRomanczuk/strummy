import Link from 'next/link';
import { Bell, Plus, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getUnreadCount } from '@/lib/services/in-app-notification-service';
import { getIsoWeek } from './topbar.helpers';

type Props = { canCreateLesson: boolean; profileId?: string | null };

/**
 * Week chip, notifications bell and the primary "New lesson" CTA. The bell
 * carries the unread count: the legacy NavigationShell bell had it, and the
 * Claude Design shell shipped without it.
 */
export async function TopbarActions({ canCreateLesson, profileId = null }: Props) {
  const t = await getTranslations('Topbar');
  const tNotif = await getTranslations('Notifications');
  const unread = profileId ? await getUnreadCount(profileId) : 0;
  return (
    <>
      <span
        data-testid="topbar-week"
        className="hidden items-center gap-1.5 rounded-full bg-[var(--gold-tint)] px-3 py-1.5 text-xs font-medium text-[var(--gold-2)] md:flex"
      >
        <Sparkles className="size-3" strokeWidth={1.6} aria-hidden="true" />
        {t('week', { n: getIsoWeek(new Date()) })}
      </span>
      <Link
        href="/dashboard/notifications"
        aria-label={
          unread > 0 ? tNotif('bellAriaLabelUnread', { count: unread }) : t('notifications')
        }
        data-testid="topbar-bell"
        className="relative grid place-items-center rounded-lg border border-[var(--rule)] bg-[var(--card)] px-2.5 py-[7px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
      >
        <Bell className="size-3.5" strokeWidth={1.6} />
        {unread > 0 && (
          <span
            data-testid="topbar-bell-badge"
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold leading-none text-[var(--paper)]"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>
      {canCreateLesson && (
        <Link
          href="/dashboard/lessons/new"
          className="hidden items-center gap-1.5 rounded-lg bg-[var(--ink)] px-3.5 py-2 text-[13px] font-medium text-[var(--paper)] transition-opacity hover:opacity-90 md:flex"
        >
          <Plus className="size-[13px]" strokeWidth={1.8} aria-hidden="true" />
          {t('newLesson')}
        </Link>
      )}
    </>
  );
}
