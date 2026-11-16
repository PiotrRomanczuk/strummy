import { getTranslations } from 'next-intl/server';

import { Card, CardContent } from '@/components/ui/card';
import { distributionsOf } from '@/lib/repertoire-stats/distributions';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { RepertoireStatsHistogram } from './RepertoireStats.Histogram';
import { REPERTOIRE_STATS_PATH } from './repertoire-stats.helpers';

type Props = { songs: RepertoireSong[]; selectedId: string | null };

/** Where the repertoire's songs sit — tempo, key, vocal range, bass density — with one song marked in each. */
export async function RepertoireStatsDistributions({ songs, selectedId }: Props) {
  const t = await getTranslations('RepertoireStats');
  const selected = songs.find((song) => song.id === selectedId) ?? null;
  const distributions = distributionsOf(songs, selected?.id ?? null);

  return (
    <section className="space-y-4">
      <form action={REPERTOIRE_STATS_PATH} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="view" value="distributions" />
        <select
          name="song"
          defaultValue={selected?.id ?? ''}
          aria-label={t('pickSong')}
          className="max-w-sm rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="">{t('noSong')}</option>
          {songs.map((song) => (
            <option key={song.id} value={song.id}>
              {song.title}
              {song.author ? ` · ${song.author}` : ''}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border px-3 py-1 text-sm hover:bg-muted">
          {t('show')}
        </button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {distributions.map((distribution) => (
          <Card key={distribution.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium">{t(`chart.${distribution.id}`)}</h3>
                <span className="text-xs text-muted-foreground">
                  {t('songsCount', { count: distribution.total })}
                </span>
              </div>
              {selected && distribution.selected && (
                <p className="text-xs">
                  {t('selectedPercentile', {
                    song: selected.title,
                    value: distribution.selected.label,
                    below: distribution.selected.below,
                  })}
                </p>
              )}
              {distribution.bins.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('noData')}</p>
              ) : (
                <RepertoireStatsHistogram
                  bins={distribution.bins}
                  label={t('chartLabel', {
                    chart: t(`chart.${distribution.id}`),
                    count: distribution.total,
                  })}
                  thisSong={t('thisSong')}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
