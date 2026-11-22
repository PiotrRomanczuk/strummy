import { Fragment } from 'react';
import Link from 'next/link';
import { Music, X } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { COMPARE_ROWS, RepertoireStatsCompareCell } from './RepertoireStats.CompareCell';
import { RepertoireStatsCopyLink } from './RepertoireStats.CopyLink';
import { CardHead, StatsLabel } from './RepertoireStatsPrimitives';
import { statsHref, type StatsParams } from './repertoire-stats.helpers';

type Props = { songs: RepertoireSong[]; params: StatsParams };

const GRID: Record<number, string> = {
  1: 'grid-cols-[130px_minmax(0,1fr)]',
  2: 'grid-cols-[130px_repeat(2,minmax(0,1fr))]',
  3: 'grid-cols-[130px_repeat(3,minmax(0,1fr))]',
};
const BUTTON =
  'inline-flex items-center gap-1.5 rounded-lg border border-[var(--rule)] px-3 py-1.5 text-[13px] text-[var(--ink-2)]';

/** Up to three songs side by side; fields only a transcription has say so when it is missing. */
export async function RepertoireStatsCompare({ songs, params }: Props) {
  const [t, locale] = await Promise.all([getTranslations('RepertoireStats'), getLocale()]);
  const context = {
    names: params.names,
    locale,
    t,
    densestBass: Math.max(1, ...songs.map((song) => song.transcription?.tracks.Bas?.perBar ?? 0)),
  };
  const ids = songs.map((song) => song.id);
  const actions = (
    <div className="flex gap-2">
      <RepertoireStatsCopyLink />
      <Link
        href={statsHref(params, { view: 'arrangement', arrangement: ids })}
        className={`hidden md:inline-flex ${BUTTON}`}
      >
        <Music aria-hidden className="size-3.5" />
        {t('view.arrangement')}
      </Link>
      <Link
        href={statsHref(params, { compare: [] })}
        aria-label={t('compare.close')}
        className={`${BUTTON} px-2`}
      >
        <X aria-hidden className="size-3.5" />
      </Link>
    </div>
  );
  return (
    <section className="mt-5 rounded-[10px] border border-t-2 border-[var(--rule)] border-t-[var(--ink)] bg-[var(--card)] px-4 pb-2 pt-4 md:px-5">
      <CardHead
        title={t('compare.title')}
        sub={t('compare.sub', { count: songs.length })}
        right={actions}
      />
      <div className="overflow-x-auto">
        <div className={`grid min-w-[560px] gap-x-6 ${GRID[songs.length] ?? GRID[3]}`}>
          <div />
          {songs.map((song) => (
            <div key={song.id} className="pb-2.5">
              <div className="font-serif text-[16px] font-medium">{song.title}</div>
              <div className="text-[12px] text-[var(--ink-3)]">{song.author}</div>
            </div>
          ))}
          {COMPARE_ROWS.map((row) => (
            <Fragment key={row}>
              <StatsLabel className="border-t border-[var(--rule-2)] py-3">
                {t(`compare.row.${row}`)}
              </StatsLabel>
              {songs.map((song) => (
                <div key={song.id} className="border-t border-[var(--rule-2)] py-2.5">
                  <RepertoireStatsCompareCell row={row} song={song} context={context} />
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
