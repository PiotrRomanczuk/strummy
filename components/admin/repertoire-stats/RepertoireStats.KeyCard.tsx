import { nameNotes, type NoteNaming } from '@/lib/music-theory/note-naming';
import type { KeyDistribution } from '@/lib/repertoire-stats/distributions';

import { KeyChart } from './RepertoireStats.Charts';
import { RepertoireStatsChartCard } from './RepertoireStats.ChartCard';
import type { Translate } from './repertoire-stats.i18n';

type Props = {
  keys: KeyDistribution;
  names: NoteNaming;
  /** The selected song's title and key label, for the highlight. */
  chosen: { title: string; key: string } | null;
  t: Translate;
};

const PITCHES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Keys have no order, so the song's key is described only by how many other songs share it. */
export function RepertoireStatsKeyCard({ keys, names, chosen, t }: Props) {
  const pitch = (i: number) => nameNotes(PITCHES[i], names);
  const major = (i: number) => t('key.major', { root: pitch(i) });
  const minor = (i: number) => t('key.minor', { root: pitch(i) });
  const { selected } = keys;
  const sentence = !selected
    ? t('context.noValue')
    : selected.others > 0
      ? t('context.sameKey', { count: selected.others })
      : t('context.onlyKey');
  const isOn = (cell: number, isMinor: boolean) =>
    selected?.pitch === cell && selected.isMinor === isMinor;
  return (
    <RepertoireStatsChartCard
      title={t('context.measure.key')}
      count={t('context.withAnalysis', { count: keys.total })}
      value={chosen?.key ?? '—'}
      sentence={sentence}
      chart={
        <KeyChart
          cells={keys.cells.map((cell) => ({
            ...cell,
            label: pitch(cell.pitch),
            majorTitle: t('context.binTitle', { label: major(cell.pitch), count: cell.major }),
            minorTitle: t('context.binTitle', { label: minor(cell.pitch), count: cell.minor }),
          }))}
          selected={selected}
          highlight={chosen ? `${chosen.title} · ${chosen.key}` : null}
          legend={{ major: t('key.majorWord'), minor: t('key.minorWord') }}
        />
      }
      table={keys.cells.flatMap((cell) => [
        { label: major(cell.pitch), value: cell.major, isSelected: isOn(cell.pitch, false) },
        { label: minor(cell.pitch), value: cell.minor, isSelected: isOn(cell.pitch, true) },
      ])}
    />
  );
}
