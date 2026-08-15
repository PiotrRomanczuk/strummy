import { fetchPendingConflicts } from '@/app/actions/calendar-conflicts';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ConflictList } from './ConflictList';

export default async function CalendarConflictsPage() {
  const t = await getTranslations('Calendar');
  const { user } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/calendar/conflicts');
  }

  const result = await fetchPendingConflicts();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('conflictsPageTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('conflictsPageSubtitle')}</p>
      </div>

      {!result.success && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 text-sm text-red-700 dark:text-red-300">
          {result.error ?? t('conflictsLoadFailed')}
        </div>
      )}

      {result.success && <ConflictList conflicts={result.conflicts ?? []} />}
    </div>
  );
}
