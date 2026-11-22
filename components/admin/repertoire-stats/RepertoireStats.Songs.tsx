import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';
import {
  TABLE_PAGE,
  facetOf,
  songTableOf,
  type SongSort,
} from '@/lib/repertoire-stats/songs-table';

import { RepertoireStatsCompare } from './RepertoireStats.Compare';
import { RepertoireStatsSongRow, SONG_COLUMNS } from './RepertoireStats.SongRow';
import { RepertoireStatsSongsFilters } from './RepertoireStats.SongsFilters';
import { StatsLabel } from './RepertoireStatsPrimitives';
import { statsHref, type StatsParams } from './repertoire-stats.helpers';

type Props = { songs: RepertoireSong[]; params: StatsParams };

const GROUPS = ['tempo', 'key', 'capo', 'duration'] as const;

function SortHead({
  sort,
  label,
  params,
  isRight,
}: {
  sort: SongSort | null;
  label: string;
  params: StatsParams;
  isRight?: boolean;
}) {
  const className = `flex items-center gap-0.5 overflow-hidden whitespace-nowrap ${isRight ? 'justify-end' : ''}`;
  if (!sort) return <StatsLabel className={className}>{label}</StatsLabel>;
  const isActive = params.sort === sort;
  const Icon = isActive && params.isAscending ? ChevronUp : ChevronDown;
  return (
    <Link
      href={statsHref(params, {
        sort,
        isAscending: isActive ? !params.isAscending : sort === 'title',
      })}
      scroll={false}
      aria-sort={isActive ? (params.isAscending ? 'ascending' : 'descending') : undefined}
    >
      <StatsLabel className={`${className} ${isActive ? 'text-[var(--ink)]' : ''}`}>
        {label}
        <Icon aria-hidden className={`size-2.5 ${isActive ? '' : 'opacity-40'}`} />
      </StatsLabel>
    </Link>
  );
}

/** "How do the songs compare?": every song, Strummy beside the recording, and up to three side by side. */
export async function RepertoireStatsSongs({ songs, params }: Props) {
  const t = await getTranslations('RepertoireStats');
  const { total, rows } = songTableOf(songs, params);
  const compared = params.compare
    .map((id) => songs.find((song) => song.id === id))
    .filter((song): song is RepertoireSong => !!song);
  const levels = facetOf(songs, (song) => song.level).map((level) => level.value);
  return (
    <div>
      <RepertoireStatsSongsFilters
        params={params}
        categories={facetOf(songs, (song) => song.category)}
        levels={levels}
      />
      <section className="rounded-[10px] border border-[var(--rule)] bg-[var(--card)] pt-3.5">
        <div className={`mb-1.5 hidden gap-x-3 px-4 md:grid ${SONG_COLUMNS}`}>
          <div className="col-span-5" />
          {GROUPS.map((group) => (
            <StatsLabel
              key={group}
              className="col-span-2 border-b border-[var(--rule)] pb-1 text-center text-[var(--ink-3)]"
            >
              {t(`field.${group}`)}
            </StatsLabel>
          ))}
          <div className="col-span-2" />
        </div>
        <div className={`hidden gap-x-3 px-4 pb-2 md:grid ${SONG_COLUMNS}`}>
          <div />
          <SortHead sort="title" label={t('songs.column.song')} params={params} />
          <SortHead sort={null} label={t('songs.column.category')} params={params} />
          <SortHead sort={null} label={t('songs.column.level')} params={params} />
          <SortHead sort={null} label={t('songs.column.data')} params={params} />
          <SortHead sort="tempo" label={t('songs.column.strummy')} params={params} isRight />
          <SortHead sort={null} label={t('songs.column.recording')} params={params} isRight />
          <SortHead sort="key" label={t('songs.column.strummy')} params={params} isRight />
          <SortHead sort={null} label={t('songs.column.recording')} params={params} isRight />
          <SortHead sort={null} label={t('songs.column.strummy')} params={params} isRight />
          <SortHead sort={null} label={t('songs.column.suggested')} params={params} isRight />
          <SortHead sort="duration" label={t('songs.column.strummy')} params={params} isRight />
          <SortHead sort={null} label={t('songs.column.recording')} params={params} isRight />
          <SortHead sort={null} label={t('songs.column.chords')} params={params} isRight />
          <SortHead sort="students" label={t('songs.column.students')} params={params} isRight />
        </div>
        {rows.length === 0 ? (
          <div className="border-t border-[var(--rule-2)] px-4 py-8 text-center">
            <div className="font-serif text-[18px] font-medium">{t('songs.emptyTitle')}</div>
            <Link
              href={statsHref(params, { q: '', category: null, level: null, hasMismatches: false })}
              className="mt-2 inline-block text-[var(--gold-2)]"
            >
              {t('songs.clearFilters')}
            </Link>
          </div>
        ) : (
          rows.map((song) => <RepertoireStatsSongRow key={song.id} song={song} params={params} />)
        )}
        <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--rule-2)] px-4 py-3 text-[var(--ink-3)]">
          <span>{t('songs.footer', { shown: rows.length, total })}</span>
          {rows.length < total && (
            <Link
              href={statsHref(params, { limit: params.limit + TABLE_PAGE })}
              scroll={false}
              className="text-[var(--gold-2)]"
            >
              {t('songs.more', { count: Math.min(TABLE_PAGE, total - rows.length) })}
            </Link>
          )}
        </div>
      </section>
      {compared.length > 0 && <RepertoireStatsCompare songs={compared} params={params} />}
    </div>
  );
}
