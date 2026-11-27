import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import {
  knownPatternsOf,
  progressionKey,
  progressionRankingOf,
  type ProgressionSongs,
} from '@/lib/repertoire-stats/progressions';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { CardHead, Degrees, MeterBar, StatsCard, StatsLabel } from './RepertoireStatsPrimitives';
import { statsHref, type StatsParams } from './repertoire-stats.helpers';
import type { Translate } from './repertoire-stats.i18n';

type Props = { songs: RepertoireSong[]; params: StatsParams };

/** Progressions in the short ranking; the rest is one link away. */
const TOP = 9;

const singleChord = (roman: string[], t: Translate) =>
  new Set(roman).size === 1
    ? t(roman[0] === roman[0].toLowerCase() ? 'progressions.oneMinor' : 'progressions.oneMajor')
    : null;

function SongList({
  entry,
  params,
  t,
}: {
  entry: ProgressionSongs;
  params: StatsParams;
  t: Translate;
}) {
  return (
    <div className="mb-3 rounded-lg border border-[var(--rule-2)] bg-[var(--paper)] px-3 py-1">
      {entry.songs.map(({ song, bars }, i) => (
        <Link
          key={song.id}
          href={statsHref(params, { song: song.id })}
          scroll={false}
          className={`flex min-h-10 items-center gap-2.5 py-1.5 text-inherit ${i ? 'border-t border-[var(--rule-2)]' : ''}`}
        >
          <span className="font-medium">{song.title}</span>
          <span className="truncate text-[var(--ink-3)]">{song.author}</span>
          <span className="flex-1" />
          {bars > 0 && (
            <span className="shrink-0 font-mono text-[12px] text-[var(--ink-3)]">
              {t('progressions.bars', { count: bars })}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

function RankRow({
  entry,
  max,
  params,
  t,
}: {
  entry: ProgressionSongs;
  max: number;
  params: StatsParams;
  t: Translate;
}) {
  const key = progressionKey(entry.roman);
  const isOpen = params.progression === key;
  const name = singleChord(entry.roman, t);
  const Icon = isOpen ? ChevronDown : ChevronRight;
  return (
    <div className="border-t border-[var(--rule-2)]">
      <Link
        href={statsHref(params, { progression: isOpen ? null : key })}
        scroll={false}
        aria-expanded={isOpen}
        className="grid min-h-11 grid-cols-[minmax(0,1fr)_70px_30px_16px] items-center gap-3 py-2 text-inherit md:grid-cols-[minmax(0,1fr)_90px_30px_16px]"
      >
        <span className="min-w-0">
          <Degrees roman={entry.roman} />
          {name && <span className="ml-2.5 text-[12px] text-[var(--ink-3)]">{name}</span>}
        </span>
        <MeterBar
          value={entry.songs.length}
          max={max}
          tone={isOpen ? 'bg-[var(--ink)]' : 'bg-[var(--ink-5)]'}
        />
        <span className="text-right font-mono">{entry.songs.length}</span>
        <Icon aria-hidden className="size-3.5 text-[var(--ink-4)]" />
      </Link>
      {isOpen && <SongList entry={entry} params={params} t={t} />}
    </div>
  );
}

/** "Which progressions do we play?": the ranking of the recordings' progressions, then the known patterns. */
export async function RepertoireStatsProgressionRanking({ songs, params }: Props) {
  const t = await getTranslations('RepertoireStats');
  const ranking = progressionRankingOf(songs);
  const shown = params.allProgressions ? ranking : ranking.slice(0, TOP);
  const max = ranking[0]?.songs.length ?? 1;
  const patterns = knownPatternsOf(songs);
  return (
    <StatsCard className="p-4 md:p-5">
      <CardHead
        title={t('progressions.rankingTitle')}
        sub={t('progressions.rankingSub')}
        right={<StatsLabel>{t('progressions.songCount')}</StatsLabel>}
      />
      {shown.map((entry) => (
        <RankRow key={progressionKey(entry.roman)} entry={entry} max={max} params={params} t={t} />
      ))}
      {ranking.length > TOP && (
        <div className="border-t border-[var(--rule-2)] pt-2.5">
          <Link
            href={statsHref(params, { allProgressions: !params.allProgressions })}
            scroll={false}
            className="text-[var(--gold-2)]"
          >
            {t(params.allProgressions ? 'progressions.showTop' : 'progressions.showAll', {
              count: ranking.length,
            })}
          </Link>
        </div>
      )}
      <StatsLabel className="mb-1 mt-6">{t('progressions.knownTitle')}</StatsLabel>
      {patterns.map((pattern) => (
        <details key={pattern.name} className="group border-t border-[var(--rule-2)]">
          <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[96px_minmax(0,1fr)_30px_16px] items-center gap-3 py-2">
            <span className="font-medium">
              {t.has(`progressions.pattern.${pattern.name}`)
                ? t(`progressions.pattern.${pattern.name}`)
                : pattern.name}
            </span>
            <Degrees roman={pattern.pattern} />
            <span className="text-right font-mono">{pattern.songs.length}</span>
            <ChevronRight
              aria-hidden
              className="size-3.5 text-[var(--ink-4)] group-open:rotate-90"
            />
          </summary>
          {pattern.songs.length > 0 && (
            <SongList
              entry={{
                roman: pattern.pattern,
                songs: pattern.songs.map((song) => ({ song, bars: 0 })),
              }}
              params={params}
              t={t}
            />
          )}
        </details>
      ))}
    </StatsCard>
  );
}
