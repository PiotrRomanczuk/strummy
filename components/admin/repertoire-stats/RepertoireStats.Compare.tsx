import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import {
  measuredTempo,
  rangeLabel,
  statsHref,
  toggleCompare,
  valueOrDash,
  type StatsParams,
} from './repertoire-stats.helpers';

type Props = { songs: RepertoireSong[]; params: StatsParams };

const minutes = (ms: number | null | undefined) =>
  ms
    ? `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`
    : '—';

/** Two or three songs side by side: what was entered next to what the recording measures. */
export async function RepertoireStatsCompare({ songs, params }: Props) {
  const t = await getTranslations('RepertoireStats');
  const rows: { label: string; value: (song: RepertoireSong) => string }[] = [
    {
      label: t('compareRow.tempo'),
      value: (s) => `${valueOrDash(s.entered.tempo)} / ${valueOrDash(measuredTempo(s))}`,
    },
    {
      label: t('compareRow.key'),
      value: (s) => `${valueOrDash(s.entered.key)} / ${valueOrDash(s.measured?.key)}`,
    },
    { label: t('compareRow.capo'), value: (s) => String(s.entered.capo) },
    { label: t('compareRow.metre'), value: (s) => valueOrDash(s.measured?.beatsPerBar) },
    {
      label: t('compareRow.duration'),
      value: (s) => `${minutes(s.entered.durationMs)} / ${minutes(s.measured?.durationMs)}`,
    },
    { label: t('compareRow.bass'), value: (s) => rangeLabel(s.transcription?.bass) },
    { label: t('compareRow.vocals'), value: (s) => rangeLabel(s.transcription?.vocals) },
    {
      label: t('compareRow.density'),
      value: (s) =>
        `${valueOrDash(s.transcription?.bass?.perBar)} / ${valueOrDash(s.transcription?.vocals?.perBar)}`,
    },
    { label: t('compareRow.chords'), value: (s) => valueOrDash(s.entered.chords) },
    {
      label: t('compareRow.heardChords'),
      value: (s) => valueOrDash(s.measured?.chords.join(', ')),
    },
  ];

  return (
    <section className="space-y-2 rounded-md border p-4">
      <h2 className="text-lg font-semibold">{t('compareTitle')}</h2>
      <p className="text-xs text-muted-foreground">{t('compareHint')}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="py-1 pr-4 text-left font-normal text-muted-foreground" />
              {songs.map((song) => (
                <th key={song.id} className="py-1 pr-4 text-left align-bottom font-medium">
                  {song.title}
                  <Link
                    href={statsHref({ ...params, compare: toggleCompare(params.compare, song.id) })}
                    className="ml-2 text-xs font-normal underline underline-offset-2"
                  >
                    {t('compareRemove')}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t">
                <th scope="row" className="py-1 pr-4 text-left font-normal text-muted-foreground">
                  {row.label}
                </th>
                {songs.map((song) => (
                  <td key={song.id} className="py-1 pr-4 font-mono">
                    {row.value(song)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
