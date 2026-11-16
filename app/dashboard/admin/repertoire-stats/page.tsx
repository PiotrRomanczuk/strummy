import { redirect } from 'next/navigation';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getSongQualityReport } from '@/lib/services/data-quality-queries';
import {
  getRepertoireSongDetail,
  getRepertoireSongs,
} from '@/lib/services/repertoire-stats-queries';
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

  const params = parseStatsParams(await searchParams);
  const needsDetail = params.view === 'progressions' && params.song !== null;
  const [songs, quality, detail] = await Promise.all([
    getRepertoireSongs(),
    getSongQualityReport(),
    needsDetail && params.song ? getRepertoireSongDetail(params.song) : Promise.resolve(null),
  ]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-7">
      <RepertoireStats songs={songs} params={params} detail={detail} quality={quality} />
    </div>
  );
}
