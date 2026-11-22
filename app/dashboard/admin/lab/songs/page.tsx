import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { firstParam, LAB_PATH, listParam, pageParam } from '@/components/lab/lab.helpers';
import { LabNav } from '@/components/lab/LabNav';
import { LabPagination } from '@/components/lab/LabPagination';
import { LabSongFilters } from '@/components/lab/LabSongFilters';
import { LabSongList } from '@/components/lab/LabSongList';
import { requireLabAdmin } from '@/lib/private-data/access';
import { loadManifest, sourceLabels } from '@/lib/private-data/manifest';
import { loadSongIndex, searchSongs, songSourceIds } from '@/lib/private-data/songs';

export const metadata = { title: 'Lab · songs' };

const BASE_PATH = `${LAB_PATH}/songs`;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Every song the hub knows, searchable and filterable by the sources it appears in. */
export default async function LabSongsPage({ searchParams }: PageProps) {
  await requireLabAdmin(BASE_PATH);
  const [index, manifest] = [loadSongIndex(), loadManifest()];
  if (!index || !manifest) notFound();

  const query = await searchParams;
  const labels = sourceLabels(manifest);
  const available = songSourceIds(index.songs, [...labels.keys()]);
  const q = firstParam(query.q);
  const has = listParam(query.has).filter((id) => available.includes(id));
  const sort = firstParam(query.sort) === 'name' ? 'name' : 'sources';
  const result = searchSongs(index.songs, { q, has, sort, page: pageParam(query.page) });
  const t = await getTranslations('Lab.songs');

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>
      <LabNav active="songs" />
      <LabSongFilters
        action={BASE_PATH}
        q={q}
        has={has}
        sort={sort}
        sources={available.map((id) => [id, labels.get(id) ?? id])}
      />
      <LabPagination
        basePath={BASE_PATH}
        params={{ q, has, sort: sort === 'name' ? 'name' : undefined }}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
      <LabSongList songs={result.songs} labels={Object.fromEntries(labels)} />
    </div>
  );
}
