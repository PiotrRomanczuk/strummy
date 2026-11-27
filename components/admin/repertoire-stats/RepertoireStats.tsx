import { mismatchListOf } from '@/lib/repertoire-stats/mismatch-list';
import type { QualityReportInput } from '@/lib/repertoire-stats/quality-list';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';
import type { SongDetail } from '@/lib/repertoire-stats/song-progressions';

import { RepertoireStatsArrangement } from './RepertoireStats.Arrangement';
import { RepertoireStatsContext } from './RepertoireStats.Context';
import { RepertoireStatsHeader } from './RepertoireStats.Header';
import { RepertoireStatsMismatches } from './RepertoireStats.Mismatches';
import { RepertoireStatsOverview } from './RepertoireStats.Overview';
import { RepertoireStatsProgressions } from './RepertoireStats.Progressions';
import { RepertoireStatsQuality } from './RepertoireStats.Quality';
import { RepertoireStatsSongs } from './RepertoireStats.Songs';
import type { StatsParams } from './repertoire-stats.helpers';

type Props = {
  songs: RepertoireSong[];
  params: StatsParams;
  detail: SongDetail | null;
  quality: QualityReportInput;
};

/** The admin repertoire statistics (SNG-13): seven views over every song, switched through the URL. */
export function RepertoireStats({ songs, params, detail, quality }: Props) {
  const counts = {
    mismatches: mismatchListOf(songs, null).total,
    songs: songs.length,
    arrangement: songs.filter((song) => song.transcription).length,
  };
  return (
    <div>
      <RepertoireStatsHeader params={params} counts={counts} />
      {params.view === 'overview' && (
        <RepertoireStatsOverview songs={songs} params={params} quality={quality} />
      )}
      {params.view === 'quality' && (
        <RepertoireStatsQuality songs={songs} report={quality} params={params} />
      )}
      {params.view === 'mismatches' && <RepertoireStatsMismatches songs={songs} params={params} />}
      {params.view === 'songs' && <RepertoireStatsSongs songs={songs} params={params} />}
      {params.view === 'context' && <RepertoireStatsContext songs={songs} params={params} />}
      {params.view === 'progressions' && (
        <RepertoireStatsProgressions songs={songs} params={params} detail={detail} />
      )}
      {params.view === 'arrangement' && (
        <RepertoireStatsArrangement songs={songs} params={params} />
      )}
    </div>
  );
}
