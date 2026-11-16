import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { GAP_KINDS, beatsPerBarOf, coverageOf } from '@/lib/repertoire-stats/coverage';
import { mismatchListOf } from '@/lib/repertoire-stats/mismatch-list';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { RepertoireStatsFunnel } from './RepertoireStats.Funnel';
import { RepertoireStatsGapGroup } from './RepertoireStats.GapGroup';
import { MeterBar, StatsCard, StatsLabel } from './RepertoireStatsPrimitives';
import { csvHref, statsHref, type StatsParams } from './repertoire-stats.helpers';

type Props = { songs: RepertoireSong[]; params: StatsParams };

/** "What is missing?": data coverage, the disagreement count and the songs to fix first. */
export async function RepertoireStatsOverview({ songs, params }: Props) {
  const t = await getTranslations('RepertoireStats.overview');
  const coverage = coverageOf(songs);
  const mismatches = mismatchListOf(songs, null);
  const metres = beatsPerBarOf(songs);
  const analysed = songs.filter((song) => song.measured?.beatsPerBar).length;
  return (
    <div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <RepertoireStatsFunnel coverage={coverage} />
        <div className="flex flex-col gap-5">
          <StatsCard className="p-5">
            <StatsLabel>{t('mismatchesLabel')}</StatsLabel>
            <div className="mb-0.5 mt-1.5 font-serif text-[30px] font-medium">
              {mismatches.total}{' '}
              <span className="font-sans text-[14px] font-normal text-[var(--ink-3)]">
                {t('ofMeasured', { count: coverage.withAnalysis })}
              </span>
            </div>
            <div className="mb-2.5 text-[12.5px] text-[var(--ink-3)]">{t('haveMismatch')}</div>
            <Link
              href={statsHref(params, { view: 'mismatches' })}
              className="inline-flex items-center gap-1.5 text-[var(--gold-2)]"
            >
              {t('seeMismatches')}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </StatsCard>
          <StatsCard className="p-5">
            <div className="mb-2.5 flex justify-between">
              <StatsLabel>{t('metre')}</StatsLabel>
              <StatsLabel>{t('songs', { count: analysed })}</StatsLabel>
            </div>
            {metres.map((metre) => (
              <div
                key={metre.beats}
                title={t('metreHint', { beats: metre.beats, count: metre.songs })}
                className="grid grid-cols-[70px_1fr_34px] items-center gap-2.5 py-1"
              >
                <span className="font-mono text-[12px]">{t('beats', { beats: metre.beats })}</span>
                <MeterBar value={metre.songs} max={metres[0]?.songs ?? 1} />
                <span className="text-right font-mono text-[12px] text-[var(--ink-3)]">
                  {metre.songs}
                </span>
              </div>
            ))}
          </StatsCard>
        </div>
      </div>
      <div className="mb-3.5 mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-[20px] font-medium">{t('gapsTitle')}</h2>
        <span className="text-[var(--ink-3)]">{t('gapsOrder')}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {GAP_KINDS.map((kind) => (
          <RepertoireStatsGapGroup
            key={kind}
            kind={kind}
            songs={coverage.gaps[kind]}
            csv={csvHref(params, kind)}
          />
        ))}
      </div>
    </div>
  );
}
