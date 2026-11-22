import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { firstParam, LAB_PATH, pageParam } from '@/components/lab/lab.helpers';
import { LabNav } from '@/components/lab/LabNav';
import { LabPagination } from '@/components/lab/LabPagination';
import { LabSearchForm } from '@/components/lab/LabSearchForm';
import { LabSourceTable } from '@/components/lab/LabSourceTable';
import { requireLabAdmin } from '@/lib/private-data/access';
import { getSource } from '@/lib/private-data/manifest';
import { readSourcePage } from '@/lib/private-data/source-rows';

export const metadata = { title: 'Lab · source' };

type PageProps = {
  params: Promise<{ source: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** One source of the hub as a searchable, paged table of its raw rows. */
export default async function LabSourcePage({ params, searchParams }: PageProps) {
  const [{ source: sourceId }, query] = await Promise.all([params, searchParams]);
  const basePath = `${LAB_PATH}/sources/${encodeURIComponent(sourceId)}`;
  await requireLabAdmin(basePath);
  const source = getSource(sourceId);
  if (!source) notFound();

  const q = firstParam(query.q);
  const [t, result] = await Promise.all([
    getTranslations('Lab'),
    readSourcePage(source, { q, page: pageParam(query.page) }),
  ]);

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href={LAB_PATH} className="text-sm text-muted-foreground underline-offset-2 hover:underline">
          ← {t('allSources')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{source.label}</h1>
          <Badge variant="outline">{source.license}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{source.description}</p>
        <p className="break-all font-mono text-xs text-muted-foreground">
          {t('file')}: {source.path}
        </p>
      </header>
      <LabNav active="sources" />
      <LabSearchForm action={basePath} q={q} />
      <LabPagination
        basePath={basePath}
        params={{ q }}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
      <LabSourceTable result={result} />
    </div>
  );
}
