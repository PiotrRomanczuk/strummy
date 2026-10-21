import { Eye } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { stopViewAsStudent } from '@/app/dashboard/view-as-actions';

/** Shown on every dashboard page while an admin previews a student. */
export const ViewAsBanner = async ({ studentName }: { studentName: string }) => {
  const t = await getTranslations('ViewAs');
  return (
    <div
      role="status"
      data-testid="view-as-banner"
      className="sticky top-0 z-50 flex flex-wrap items-center gap-x-4 gap-y-2 bg-[var(--ink)] px-4 py-2 text-[13px] text-[var(--paper)]"
    >
      <span className="inline-flex items-center gap-2 font-[family-name:var(--mono)] text-[11px] uppercase tracking-[.12em] text-[var(--gold,#d4a72c)]">
        <Eye size={14} aria-hidden="true" /> {t('bannerLabel')}
      </span>
      <span className="min-w-0 flex-1">{t('bannerText', { name: studentName })}</span>
      <form action={stopViewAsStudent}>
        <button
          type="submit"
          data-testid="view-as-exit"
          className="rounded-md border border-[var(--paper)]/40 px-3 py-1 text-[12px] font-medium hover:bg-[var(--paper)]/10"
        >
          {t('exit')}
        </button>
      </form>
    </div>
  );
};
