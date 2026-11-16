import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getRepertoireSongs } from '@/lib/services/repertoire-stats-queries';
import { RepertoireStats } from '@/components/admin/repertoire-stats/RepertoireStats';
import {
  REPERTOIRE_STATS_PATH,
  parseStatsParams,
  type RawStatsParams,
} from '@/components/admin/repertoire-stats/repertoire-stats.helpers';

export const metadata = { title: 'Repertoire statistics' };

type PageProps = { searchParams: Promise<RawStatsParams> };

export default async function RepertoireStatsPage({ searchParams }: PageProps) {
  const { user, isAdmin } = await getUserWithRolesSSR();
  if (!user) redirect(`/sign-in?redirect=${REPERTOIRE_STATS_PATH}`);
  if (!isAdmin) redirect('/dashboard');

  const [raw, t, songs] = await Promise.all([
    searchParams,
    getTranslations('RepertoireStats'),
    getRepertoireSongs(),
  ]);

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <RepertoireStats songs={songs} params={parseStatsParams(raw)} />
    </div>
  );
}
