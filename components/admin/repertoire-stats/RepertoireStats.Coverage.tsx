import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent } from '@/components/ui/card';
import { coverageOf } from '@/lib/repertoire-stats/coverage';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

const percent = (part: number, total: number) => (total ? Math.round((100 * part) / total) : 0);

/** How much of the repertoire has a recording link, an analysis and a transcription, and what each song lacks. */
export async function RepertoireStatsCoverage({ songs }: { songs: RepertoireSong[] }) {
  const t = await getTranslations('RepertoireStats');
  const coverage = coverageOf(songs);
  const tiles = [
    { label: t('tileSongs'), value: coverage.total, share: null },
    {
      label: t('tileLink'),
      value: coverage.withLink,
      share: percent(coverage.withLink, coverage.total),
    },
    {
      label: t('tileAnalysis'),
      value: coverage.withAnalysis,
      share: percent(coverage.withAnalysis, coverage.total),
    },
    {
      label: t('tileTranscription'),
      value: coverage.withTranscription,
      share: percent(coverage.withTranscription, coverage.total),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              <p className="font-mono text-3xl font-semibold tabular-nums">{tile.value}</p>
              {tile.share !== null && (
                <p className="text-xs text-muted-foreground">
                  {t('tileShare', { share: tile.share })}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <h2 className="text-lg font-semibold">
        {t('missingTitle', { count: coverage.missing.length })}
      </h2>
      {coverage.missing.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('missingEmpty')}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {coverage.missing.map(({ song, lacks }) => (
            <li
              key={song.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
            >
              <Link
                href={`/dashboard/songs/${song.id}`}
                className="text-sm font-medium hover:underline"
              >
                {song.title}
                {song.author && <span className="text-muted-foreground"> · {song.author}</span>}
              </Link>
              <span className="flex flex-wrap gap-1">
                {lacks.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-muted px-2 text-xs text-muted-foreground"
                  >
                    {t(`lacks.${item}`)}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
