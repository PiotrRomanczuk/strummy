import { getTranslations } from 'next-intl/server';

import type { Song } from '@/components/songs/types';
import { getSongsLearnerSummaries } from '@/lib/services/song-detail-queries';
import type { SongsListFilters, SongsListResult } from '@/lib/services/songs-list-queries';

import { DataList } from '@/components/shared/DataList';
import { ListPagination } from '@/components/shared/ListPagination';

import { SongsListFiltersBar } from './SongsList.Filters';
import { songsColumns } from './SongsList.Header';
import { SongsListPanel } from './SongsList.Panel';
import { SongRow } from './SongsList.Row';
import { buildHref } from './songs-list.helpers';
import { SONGS_TEMPLATE } from './songs-row.styles';
import { WantToLearnButton } from './WantToLearnButton';

type Props = {
  songs: Song[];
  total: number;
  page: number;
  totalPages: number;
  breakdown: SongsListResult['breakdown'];
  categories: SongsListResult['categories'];
  canCreate: boolean;
  filters: SongsListFilters;
  /** Student viewers get a per-row "want to learn" control. */
  canPickToLearn?: boolean;
  /** Song ids already in the viewer's repertoire — one query, not one per row. */
  repertoireSongIds?: Set<string>;
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
  const hasFilters = Boolean(
    filters.search || filters.level || filters.key || filters.author || filters.category
  );
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
  categories,
  canCreate,
  filters,
  canPickToLearn = false,
  repertoireSongIds,
}: Props) => {
  const t = await getTranslations('Songs');
  const learnerSummaries = await getSongsLearnerSummaries(songs.map((s) => s.id));
  const selectedSong = filters.selected
    ? (songs.find((s) => s.id === filters.selected) ?? null)
    : null;

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
        categories={categories}
        filters={filters}
        canRequest={canPickToLearn}
      />
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <DataList
            columns={songsColumns(t, filters, canPickToLearn)}
            template={SONGS_TEMPLATE(canPickToLearn)}
            empty={
              <EmptyState
                filters={filters}
                emptyNoMatch={t('emptyNoMatch')}
                emptyNoSongs={t('emptyNoSongs')}
              />
            }
          >
            {songs.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                untitledFallback={t('untitledFallback')}
                filters={filters}
                learnerSummary={learnerSummaries[song.id]}
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
          </DataList>
          <ListPagination
            page={page}
            totalPages={totalPages}
            hrefForPage={(p) => buildHref({ page: p }, filters)}
            labels={{
              prev: t('prevPage'),
              next: t('nextPage'),
              status: t('pageOf', { page, total: totalPages }),
            }}
          />
        </div>
        {selectedSong && (
          <SongsListPanel
            song={selectedSong}
            filters={filters}
            untitledFallback={t('untitledFallback')}
            canPickToLearn={canPickToLearn}
            isInRepertoire={Boolean(repertoireSongIds?.has(selectedSong.id))}
          />
        )}
      </div>
    </div>
  );
};
