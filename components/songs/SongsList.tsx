import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { Song } from '@/components/songs/types';
import type { SongsListFilters, SongsListResult } from '@/lib/services/songs-list-queries';

import { levelLabel } from './format';
import { Card } from './primitives';
import { SongsListFiltersBar } from './SongsList.Filters';
import { SongsListPagination } from './SongsList.Pagination';

type Props = {
  songs: Song[];
  total: number;
  page: number;
  totalPages: number;
  breakdown: SongsListResult['breakdown'];
  canCreate: boolean;
  filters: SongsListFilters;
};

const COLUMNS_CLASS = 'grid grid-cols-1 md:grid-cols-[1fr_200px_100px_90px]';

const headerCellStyle = {
  gap: 14,
  padding: '12px 20px',
  borderBottom: '1px solid var(--rule)',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '.12em',
  color: 'var(--ink-4)',
};

const SongRow = ({
  song,
  t,
  untitledFallback,
}: {
  song: Song;
  t: (key: string) => string;
  untitledFallback: string;
}) => {
  const mobileMeta = [song.author, song.level ? levelLabel(song.level, t) : null, song.key]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/dashboard/songs/${song.id}`}
      className={`ui-row ${COLUMNS_CLASS}`}
      style={{
        gap: 14,
        padding: '14px 20px',
        borderBottom: '1px solid var(--rule)',
        textDecoration: 'none',
        color: 'inherit',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          fontSize: 15,
          color: 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {song.title || untitledFallback}
      </div>
      {/* Mobile: one labelled meta line instead of a stack of bare cells. */}
      {mobileMeta && (
        <div className="md:hidden" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: -8 }}>
          {mobileMeta}
        </div>
      )}
      <div
        className="hidden md:block"
        style={{
          fontSize: 13,
          color: 'var(--ink-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {song.author || '—'}
      </div>
      <div
        className="hidden md:block"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: 'var(--ink-3)',
        }}
      >
        {song.level ? levelLabel(song.level, t) : '—'}
      </div>
      <div
        className="hidden md:block"
        style={{
          textAlign: 'right',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          color: 'var(--ink-3)',
        }}
      >
        {song.key || '—'}
      </div>
    </Link>
  );
};

const EmptyState = ({
  filters,
  emptyNoMatch,
  emptyNoSongs,
}: {
  filters: SongsListFilters;
  emptyNoMatch: string;
  emptyNoSongs: string;
}) => {
  const hasFilters = Boolean(filters.search || filters.level || filters.key || filters.author);
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--ink-4)',
        fontStyle: 'italic',
        fontFamily: 'var(--serif)',
        fontSize: 15,
      }}
    >
      {hasFilters ? emptyNoMatch : emptyNoSongs}
    </div>
  );
};

export const SongsList = async ({
  songs,
  total,
  page,
  totalPages,
  breakdown,
  canCreate,
  filters,
}: Props) => {
  const t = await getTranslations('Songs');
  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '28px 32px 64px',
      }}
    >
      <SongsListFiltersBar
        total={total}
        canCreate={canCreate}
        breakdown={breakdown}
        filters={filters}
      />
      <Card>
        {songs.length === 0 ? (
          <EmptyState
            filters={filters}
            emptyNoMatch={t('emptyNoMatch')}
            emptyNoSongs={t('emptyNoSongs')}
          />
        ) : (
          <div>
            <div className={`hidden md:grid ${COLUMNS_CLASS}`} style={headerCellStyle}>
              <span>{t('colTitle')}</span>
              <span>{t('colAuthor')}</span>
              <span>{t('colLevel')}</span>
              <span style={{ textAlign: 'right' }}>{t('colKey')}</span>
            </div>
            {songs.map((song) => (
              <SongRow key={song.id} song={song} t={t} untitledFallback={t('untitledFallback')} />
            ))}
          </div>
        )}
      </Card>
      <SongsListPagination page={page} totalPages={totalPages} filters={filters} />
    </div>
  );
};
