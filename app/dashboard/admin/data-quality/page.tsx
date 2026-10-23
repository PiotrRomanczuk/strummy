import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getSongQualityReport } from '@/lib/services/data-quality-queries';
import { DATA_QUALITY_PATH, DataQualityReport } from '@/components/data-quality/DataQualityReport';

export const metadata = { title: 'Data quality' };

type PageProps = { searchParams: Promise<{ rule?: string }> };

export default async function DataQualityPage({ searchParams }: PageProps) {
  const { user, isAdmin } = await getUserWithRolesSSR();
  if (!user) redirect(`/sign-in?redirect=${DATA_QUALITY_PATH}`);
  if (!isAdmin) redirect('/dashboard');

  const [{ rule }, t, { quality, songsById }] = await Promise.all([
    searchParams,
    getTranslations('DataQuality'),
    getSongQualityReport(),
  ]);

  const toRow = (id: string) => {
    const song = songsById.get(id);
    if (!song) return null;
    return {
      title: song.title || '—',
      subtitle: song.author,
      editHref: `/dashboard/songs/${id}/edit`,
    };
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <DataQualityReport quality={quality} activeRuleId={rule ?? null} toRow={toRow} />
    </div>
  );
}
