import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** "N lessons to confirm" — links to the calendar's month review. Hidden at zero. */
export const AwaitingConfirmationCard = async ({ count }: { count: number }) => {
  if (count === 0) return null;
  const t = await getTranslations('TeacherHome');
  return (
    <Link
      href="/dashboard/calendar"
      data-testid="awaiting-confirmation-card"
      className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--rule)] bg-[var(--card)] px-5 py-4 text-[var(--ink)] no-underline shadow-[var(--shadow-sm)]"
    >
      <span className="font-[family-name:var(--serif)] text-lg">
        {t('lessonsToConfirm', { count })}
      </span>
      <span className="font-[family-name:var(--mono)] text-[11px] uppercase tracking-[.14em] text-[var(--gold-2)]">
        {t('lessonsToConfirmAction')}
      </span>
    </Link>
  );
};
