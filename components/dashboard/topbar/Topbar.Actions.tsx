import Link from 'next/link';
import { Bell, Plus, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getIsoWeek } from './topbar.helpers';

/** Week chip, notifications bell and the primary "New lesson" CTA. */
export async function TopbarActions({ canCreateLesson }: { canCreateLesson: boolean }) {
  const t = await getTranslations('Topbar');
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
        aria-label={t('notifications')}
        className="grid place-items-center rounded-lg border border-[var(--rule)] bg-[var(--card)] px-2.5 py-[7px] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
      >
        <Bell className="size-3.5" strokeWidth={1.6} />
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
