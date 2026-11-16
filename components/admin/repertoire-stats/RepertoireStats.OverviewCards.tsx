import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { beatsPerBarOf } from '@/lib/repertoire-stats/coverage';
import { fillCountsOf, type QualityReportInput } from '@/lib/repertoire-stats/quality-list';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { MeterBar, StatsCard, StatsLabel } from './RepertoireStatsPrimitives';

type HeadlineProps = {
  label: string;
  value: number;
  unit: string;
  lines: string[];
  href: string;
  action: string;
};

/** A headline number with its explanation and a way into the view behind it. */
export function OverviewHeadline({ label, value, unit, lines, href, action }: HeadlineProps) {
  return (
    <StatsCard className="p-5">
      <StatsLabel>{label}</StatsLabel>
      <div className="mb-0.5 mt-1.5 font-serif text-[30px] font-medium">
        {value}{' '}
        <span className="font-sans text-[14px] font-normal text-[var(--ink-3)]">{unit}</span>
      </div>
      {lines.map((line) => (
        <div key={line} className="text-[12.5px] text-[var(--ink-3)]">
          {line}
        </div>
      ))}
      <Link href={href} className="mt-2.5 inline-flex items-center gap-1.5 text-[var(--gold-2)]">
        {action}
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </StatsCard>
  );
}

/** The quality score in one card: average, bands, and what the recordings can fill in. */
export async function OverviewQuality({
  report,
  href,
}: {
  report: QualityReportInput;
  href: string;
}) {
  const t = await getTranslations('RepertoireStats.overview');
  const { bands, averageScore } = report.quality;
  const fill = fillCountsOf(report.suggestions);
  const lines = [
    t('qualityBands', { good: bands.good, fair: bands.fair, poor: bands.poor }),
    t('qualityFill', { count: fill.values }),
  ];
  return (
    <OverviewHeadline
      label={t('qualityLabel')}
      value={averageScore}
      unit={t('qualityUnit')}
      lines={lines}
      href={href}
      action={t('seeQuality')}
    />
  );
}

/** Beats per bar of the analysed songs, most common first. */
export async function OverviewMetre({ songs }: { songs: RepertoireSong[] }) {
  const t = await getTranslations('RepertoireStats.overview');
  const metres = beatsPerBarOf(songs);
  const analysed = songs.filter((song) => song.measured?.beatsPerBar).length;
  return (
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
  );
}
