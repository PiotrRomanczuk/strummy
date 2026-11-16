import { redirect } from 'next/navigation';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { bySong } from '@/lib/repertoire-stats/quality-list';
import { getSongQualityReport } from '@/lib/services/data-quality-queries';
import { getPendingSuggestions } from '@/lib/services/song-suggestions';
import { createClient } from '@/lib/supabase/server';
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
  const [songs, quality, pending, detail] = await Promise.all([
    getRepertoireSongs(),
    getSongQualityReport(),
    createClient().then(getPendingSuggestions),
    needsDetail && params.song ? getRepertoireSongDetail(params.song) : Promise.resolve(null),
  ]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-7">
      <RepertoireStats
        songs={songs}
        params={params}
        detail={detail}
        quality={{ ...quality, ai: bySong(pending) }}
      />
    </div>
  );
}
