import { getTranslations } from 'next-intl/server';

import type { Song } from '@/components/songs/types';
import type { SongsListFilters, SongsListResult } from '@/lib/services/songs-list-queries';

import { Card } from './SongPrimitives';
import { SongsListFiltersBar } from './SongsList.Filters';
import { COLUMNS_CLASS, COLUMNS_WITH_ACTION_CLASS, SongRow } from './SongsList.Row';
import { WantToLearnButton } from './WantToLearnButton';
import { SongsListPagination } from './SongsList.Pagination';

type Props = {
  songs: Song[];
  total: number;
  page: number;
  totalPages: number;
  breakdown: SongsListResult['breakdown'];
  canCreate: boolean;
  filters: SongsListFilters;
  /** Student viewers get a per-row "want to learn" control. */
  canPickToLearn?: boolean;
  /** Song ids already in the viewer's repertoire — one query, not one per row. */
  repertoireSongIds?: Set<string>;
};

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

/** Desktop column headings. The trailing blank cell matches the action column. */
const HeaderRow = ({ t, hasAction }: { t: (key: string) => string; hasAction: boolean }) => (
  <div
    className={`hidden md:grid ${hasAction ? COLUMNS_WITH_ACTION_CLASS : COLUMNS_CLASS}`}
    style={headerCellStyle}
  >
    <span>{t('colTitle')}</span>
    <span>{t('colAuthor')}</span>
    <span>{t('colLevel')}</span>
    <span style={{ textAlign: 'right' }}>{t('colKey')}</span>
    {hasAction && <span />}
  </div>
);

export const SongsList = async ({
  songs,
  total,
  page,
  totalPages,
  breakdown,
  canCreate,
  filters,
  canPickToLearn = false,
  repertoireSongIds,
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
            <HeaderRow t={t} hasAction={canPickToLearn} />
            {songs.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                t={t}
                untitledFallback={t('untitledFallback')}
                action={
                  canPickToLearn ? (
                    <WantToLearnButton
                      songId={song.id}
                      variant="compact"
                      // The list only knows membership, not whether the entry is
                      // still removable, so an existing row renders as locked.
                      // Undo lives on the song page, which has the full entry.
                      initial={
                        repertoireSongIds?.has(song.id)
                          ? { kind: 'added-locked' }
                          : { kind: 'absent' }
                      }
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </Card>
      <SongsListPagination page={page} totalPages={totalPages} filters={filters} />
    </div>
  );
};
