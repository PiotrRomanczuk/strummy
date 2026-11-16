import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { songsWithMismatches, type Mismatch } from '@/lib/repertoire-stats/mismatches';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

type Translate = Awaited<ReturnType<typeof getTranslations<'RepertoireStats'>>>;

const verdictText = (mismatch: Mismatch, t: Translate) =>
  mismatch.kind === 'chords'
    ? t('chordsShare', { share: Math.round(Number(mismatch.verdict) * 100) })
    : t(`verdict.${mismatch.verdict as 'half_double' | 'relative' | 'different'}`);

/** Songs whose entered tempo, key, length or chords disagree with the recording, most disagreements first. */
export async function RepertoireStatsMismatches({ songs }: { songs: RepertoireSong[] }) {
  const t = await getTranslations('RepertoireStats');
  const found = songsWithMismatches(songs);
  const measured = songs.filter((song) => song.measured).length;

  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('mismatchesSummary', { count: found.length, measured })}
      </p>
      {found.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('mismatchesEmpty')}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {found.map(({ song, mismatches }) => (
            <li key={song.id} className="space-y-1 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/dashboard/songs/${song.id}`} className="font-medium hover:underline">
                  {song.title}
                  {song.author && <span className="text-muted-foreground"> · {song.author}</span>}
                </Link>
                <Link
                  href={`/dashboard/songs/${song.id}/edit`}
                  className="text-xs underline underline-offset-2"
                >
                  {t('edit')}
                </Link>
              </div>
              <ul className="space-y-0.5 text-sm">
                {mismatches.map((mismatch) => (
                  <li key={mismatch.kind} className="flex flex-wrap gap-x-2">
                    <span className="w-24 shrink-0 text-muted-foreground">
                      {t(`kind.${mismatch.kind}`)}
                    </span>
                    <span className="font-mono">
                      {mismatch.entered} → {mismatch.measured}
                    </span>
                    <span className="text-muted-foreground">({verdictText(mismatch, t)})</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
