import Link from 'next/link';
import { ChevronRight, Download } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { GapKind } from '@/lib/repertoire-stats/coverage';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { StatsCard, StatsLabel, StudentCount } from './RepertoireStatsPrimitives';

type Props = { kind: GapKind; songs: RepertoireSong[]; csv: string };

/** Rows shown before "show the rest": enough to act on today, short enough to scan. */
const SHOWN = 6;

function SongLink({ song, studentsLabel }: { song: RepertoireSong; studentsLabel: string }) {
  return (
    <Link
      href={`/dashboard/songs/${song.id}`}
      className="flex min-h-11 items-center gap-2.5 border-t border-[var(--rule-2)] py-2 text-inherit hover:no-underline"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{song.title}</div>
        <div className="text-[12px] text-[var(--ink-3)]">{song.author}</div>
      </div>
      <StudentCount count={song.students} label={studentsLabel} />
      <ChevronRight aria-hidden className="size-3.5 text-[var(--ink-4)]" />
    </Link>
  );
}

/** One group of songs missing the same pipeline step, the songs most students play first. */
export async function RepertoireStatsGapGroup({ kind, songs, csv }: Props) {
  const t = await getTranslations('RepertoireStats.gaps');
  const studentsLabel = t('studentsHint');
  const rest = songs.slice(SHOWN);
  return (
    <StatsCard className="px-5 pb-3.5 pt-5">
      <div className="flex items-baseline justify-between gap-2.5">
        <h3 className="font-serif text-[18px] font-medium">{t(`${kind}.title`)}</h3>
        <span className="font-serif text-[26px] font-medium">{songs.length}</span>
      </div>
      <div className="mb-3 mt-1 text-[12.5px] text-[var(--ink-3)]">{t(`${kind}.todo`)}</div>
      <div className="mb-1.5 flex justify-between">
        <StatsLabel>{t('song')}</StatsLabel>
        <StatsLabel>{t('students')}</StatsLabel>
      </div>
      {songs.slice(0, SHOWN).map((song) => (
        <SongLink key={song.id} song={song} studentsLabel={studentsLabel} />
      ))}
      <div className="flex items-center justify-between border-t border-[var(--rule-2)] pt-2.5">
        {rest.length > 0 ? (
          <details className="group w-full">
            <summary className="min-h-11 cursor-pointer list-none py-2 text-[var(--gold-2)] group-open:hidden">
              {t('showRest', { count: rest.length })}
            </summary>
            {rest.map((song) => (
              <SongLink key={song.id} song={song} studentsLabel={studentsLabel} />
            ))}
          </details>
        ) : (
          <span />
        )}
        <a
          href={csv}
          className="inline-flex shrink-0 items-center gap-1.5 self-start py-2 text-[var(--ink-3)]"
        >
          <Download aria-hidden className="size-3.5" />
          CSV
        </a>
      </div>
    </StatsCard>
  );
}
