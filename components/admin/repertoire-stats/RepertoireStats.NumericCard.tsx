import { nameNotes, type NoteNaming } from '@/lib/music-theory/note-naming';
import { midiName } from '@/lib/music-theory/transcription-roll';
import type { NumericDistribution, NumericId } from '@/lib/repertoire-stats/distributions';

import { Dots, Histogram } from './RepertoireStats.Charts';
import { RepertoireStatsChartCard } from './RepertoireStats.ChartCard';
import { decimal, type Translate } from './repertoire-stats.i18n';

type Props = { distribution: NumericDistribution; names: NoteNaming; locale: string; t: Translate };

const TICKS = 5;

function formatterOf(id: NumericId, names: NoteNaming, locale: string, t: Translate) {
  if (id === 'tempo') {
    return {
      value: (v: number) => t('bpm', { value: Math.round(v) }),
      axis: (v: number) => String(Math.round(v)),
    };
  }
  if (id === 'bassDensity') {
    return { value: (v: number) => decimal(v, locale), axis: (v: number) => decimal(v, locale) };
  }
  const note = (v: number) => nameNotes(midiName(Math.round(v)), names);
  return { value: note, axis: note };
}

function ticksOf(distribution: NumericDistribution): number[] {
  const values = distribution.points.map((point) => point.value);
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const ticks = Array.from({ length: TICKS }, (_, i) => min + ((max - min) * i) / (TICKS - 1));
  const rounded = ticks.map((tick) =>
    distribution.id === 'bassDensity' ? Math.round(tick * 2) / 2 : Math.round(tick)
  );
  return [...new Set(rounded)];
}

function sentenceOf({ id, selected }: NumericDistribution, t: Translate): string | null {
  if (!selected) return t('context.noValue');
  const { standing } = selected;
  if (!standing) return null;
  const values = standing.kind === 'top' || standing.kind === 'bottom' ? {} : { ...standing };
  return t(`context.standing.${id}.${standing.kind}`, values);
}

/**
 * One measure against the repertoire: a histogram and a percentile for many songs, a point per song and a count
 * for few (FEW_SONGS).
 */
export function RepertoireStatsNumericCard({ distribution, names, locale, t }: Props) {
  const { id, isFew, total, selected } = distribution;
  const format = formatterOf(id, names, locale, t);
  const chosen = distribution.points.find((point) => point.isSelected);
  const highlight = chosen ? `${chosen.title} · ${format.value(chosen.value)}` : null;
  const binLabel = (low: number) => {
    if (id === 'bassDensity') return `${low}–${low + distribution.step}`;
    return id === 'tempo' ? String(low) : format.axis(low);
  };
  const count =
    id === 'tempo'
      ? t('context.withAnalysis', { count: total })
      : t(isFew ? 'context.fewTranscribed' : 'context.withTranscription', { count: total });
  const bins = distribution.bins.map((bin) => ({
    label: binLabel(bin.low),
    count: bin.count,
    isSelected: bin.isSelected,
    title: t('context.binTitle', { label: binLabel(bin.low), count: bin.count }),
  }));
  const chart = isFew ? (
    <Dots
      dots={distribution.points}
      ticks={ticksOf(distribution)}
      format={format.axis}
      highlight={highlight}
    />
  ) : (
    <Histogram bins={bins} highlight={highlight} every={bins.length > 14 ? 2 : 1} />
  );
  const table = isFew
    ? distribution.points.map((point) => ({
        label: point.title,
        value: format.value(point.value),
        isSelected: point.isSelected,
      }))
    : bins.map((bin) => ({ label: bin.label, value: bin.count, isSelected: bin.isSelected }));
  return (
    <RepertoireStatsChartCard
      title={t(`context.measure.${id}`)}
      count={count}
      isFew={isFew && id !== 'tempo'}
      value={selected ? format.value(selected.value) : '—'}
      sentence={sentenceOf(distribution, t)}
      chart={chart}
      table={table}
    />
  );
}
