import { getTranslations } from 'next-intl/server';

import { GAP_KINDS, coverageOf } from '@/lib/repertoire-stats/coverage';
import { mismatchListOf } from '@/lib/repertoire-stats/mismatch-list';
import type { QualityReportInput } from '@/lib/repertoire-stats/quality-list';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { RepertoireStatsFunnel } from './RepertoireStats.Funnel';
import { RepertoireStatsGapGroup } from './RepertoireStats.GapGroup';
import { OverviewHeadline, OverviewMetre, OverviewQuality } from './RepertoireStats.OverviewCards';
import { csvHref, statsHref, type StatsParams } from './repertoire-stats.helpers';

type Props = { songs: RepertoireSong[]; params: StatsParams; quality: QualityReportInput };

/** "What is missing?": data coverage, quality, the disagreement count and the songs to fix first. */
export async function RepertoireStatsOverview({ songs, params, quality }: Props) {
  const t = await getTranslations('RepertoireStats.overview');
  const coverage = coverageOf(songs);
  const mismatches = mismatchListOf(songs, null);
  return (
    <div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <RepertoireStatsFunnel coverage={coverage} />
        <div className="flex flex-col gap-5">
          <OverviewQuality report={quality} href={statsHref(params, { view: 'quality' })} />
          <OverviewHeadline
            label={t('mismatchesLabel')}
            value={mismatches.total}
            unit={t('ofMeasured', { count: coverage.withAnalysis })}
            lines={[t('haveMismatch')]}
            href={statsHref(params, { view: 'mismatches' })}
            action={t('seeMismatches')}
          />
          <OverviewMetre songs={songs} />
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
