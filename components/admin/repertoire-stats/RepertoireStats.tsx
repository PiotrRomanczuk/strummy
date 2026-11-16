import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { RepertoireStatsCompare } from './RepertoireStats.Compare';
import { RepertoireStatsCoverage } from './RepertoireStats.Coverage';
import { RepertoireStatsDistributions } from './RepertoireStats.Distributions';
import { RepertoireStatsMismatches } from './RepertoireStats.Mismatches';
import { RepertoireStatsSongsTable, type SongTableRow } from './RepertoireStats.SongsTable';
import {
  VIEWS,
  measuredTempo,
  rangeLabel,
  statsHref,
  toggleCompare,
  type StatsParams,
} from './repertoire-stats.helpers';

type Props = { songs: RepertoireSong[]; params: StatsParams };

const pillClass = (isActive: boolean) =>
  `rounded-full border px-3 py-1 text-sm ${
    isActive
      ? 'border-foreground bg-foreground text-background'
      : 'border-border text-muted-foreground hover:text-foreground'
  }`;

const toRow = (song: RepertoireSong, params: StatsParams): SongTableRow => ({
  id: song.id,
  title: song.title,
  author: song.author,
  category: song.category,
  tempo: song.entered.tempo,
  bpm: measuredTempo(song),
  key: song.entered.key,
  measuredKey: song.measured?.key ?? null,
  metre: song.measured?.beatsPerBar ?? null,
  bassRange: rangeLabel(song.transcription?.bass),
  vocalRange: rangeLabel(song.transcription?.vocals),
  bassPerBar: song.transcription?.bass?.perBar ?? null,
  hasLink: song.hasLink,
  hasAnalysis: !!song.measured,
  hasTranscription: !!song.transcription,
  isCompared: params.compare.includes(song.id),
  compareHref: statsHref({ ...params, compare: toggleCompare(params.compare, song.id) }),
});

/** The admin repertoire statistics (SNG-13): four views over every song, switched through the URL. */
export async function RepertoireStats({ songs, params }: Props) {
  const t = await getTranslations('RepertoireStats');
  const compared = params.compare
    .map((id) => songs.find((song) => song.id === id))
    .filter((song): song is RepertoireSong => !!song);

  return (
    <div className="space-y-6">
      <nav aria-label={t('views')} className="flex flex-wrap gap-2">
        {VIEWS.map((view) => (
          <Link
            key={view}
            href={statsHref({ ...params, view })}
            aria-current={params.view === view ? 'page' : undefined}
            className={pillClass(params.view === view)}
          >
            {t(`view.${view}`)}
          </Link>
        ))}
      </nav>
      {params.view === 'coverage' && <RepertoireStatsCoverage songs={songs} />}
      {params.view === 'songs' && (
        <>
          {compared.length > 0 && <RepertoireStatsCompare songs={compared} params={params} />}
          <RepertoireStatsSongsTable rows={songs.map((song) => toRow(song, params))} />
        </>
      )}
      {params.view === 'mismatches' && <RepertoireStatsMismatches songs={songs} />}
      {params.view === 'distributions' && (
        <RepertoireStatsDistributions songs={songs} selectedId={params.song} />
      )}
    </div>
  );
}
