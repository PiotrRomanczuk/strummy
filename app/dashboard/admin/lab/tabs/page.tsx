import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { firstParam, LAB_PATH, pageParam } from '@/components/lab/lab.helpers';
import { LabNav } from '@/components/lab/LabNav';
import { LabPagination } from '@/components/lab/LabPagination';
import { tabKind } from '@/components/lab/tabs/lab-tabs.helpers';
import { LabTabFilters } from '@/components/lab/tabs/LabTabFilters';
import { LabTabList } from '@/components/lab/tabs/LabTabList';
import { requireLabAdmin } from '@/lib/private-data/access';
import { facet, loadTabIndex, searchTabs } from '@/lib/private-data/tabs';

export const metadata = { title: 'Lab · tabs' };

const BASE_PATH = `${LAB_PATH}/tabs`;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The Guitar Pro tab library: one copy of every good file, songs and exercises. */
export default async function LabTabsPage({ searchParams }: PageProps) {
  await requireLabAdmin(BASE_PATH);
  const index = loadTabIndex();
  if (!index) notFound();

  const query = await searchParams;
  const q = firstParam(query.q);
  const kind = tabKind(firstParam(query.kind));
  const filters = {
    tuning: { value: firstParam(query.tuning), options: facet(index.tabs, (tab) => tab.tunings).slice(0, 30) },
    role: { value: firstParam(query.role), options: facet(index.tabs, (tab) => tab.roles) },
    topic: { value: firstParam(query.topic), options: facet(index.tabs, (tab) => [tab.exercise?.topic]) },
  };
  const result = searchTabs(index.tabs, {
    q,
    kind,
    tuning: filters.tuning.value,
    role: filters.role.value,
    topic: filters.topic.value,
    page: pageParam(query.page),
  });
  const t = await getTranslations('Lab.tabs');

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>
      <LabNav active="tabs" />
      <LabTabFilters
        action={BASE_PATH}
        q={q}
        kind={kind}
        choices={Object.entries(filters).map(([name, filter]) => ({ name, ...filter }))}
      />
      <LabPagination
        basePath={BASE_PATH}
        params={{
          q,
          kind: kind === 'all' ? undefined : kind,
          tuning: filters.tuning.value,
          role: filters.role.value,
          topic: filters.topic.value,
        }}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
      <LabTabList tabs={result.tabs} />
    </div>
  );
}
