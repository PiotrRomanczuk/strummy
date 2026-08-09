import { getTranslations } from 'next-intl/server';

import {
  DataListActionCell,
  DataListCell,
  DataListRow,
  DataListTitle,
} from '@/components/shared/DataList';
import type { Song } from '@/components/songs/types';
import type { SongLearnerSummary } from '@/lib/services/song-detail-queries';
import type { SongsListFilters } from '@/lib/services/songs-list-queries';

import { AlbumThumb } from './AlbumThumb';
import { MasteryBar } from './MasteryBar';
import { levelLabel } from './song-format.helpers';
import { buildHref } from './songs-list.helpers';
import { formatAdded, SONGS_TEMPLATE, titleMetaStyle } from './songs-row.styles';

export const SongRow = async ({
  song,
  untitledFallback,
  filters,
  learnerSummary,
  action,
}: {
  song: Song;
  untitledFallback: string;
  /** Current list filters — the row link opens the panel via `?selected=`, keeping every other filter intact. */
  filters: SongsListFilters;
  learnerSummary?: SongLearnerSummary;
  /** Student-only "want to learn" control; absent for every other viewer. */
  action?: React.ReactNode;
}) => {
  const t = await getTranslations('Songs');
  const title = song.title || untitledFallback;
  const isSelected = filters.selected === song.id;
  const mobileMeta = [song.author, song.level ? levelLabel(song.level, t) : null, song.key]
    .filter(Boolean)
    .join(' · ');
  const titleMeta = [song.category, song.release_year].filter(Boolean).join(' · ');

  return (
    <DataListRow
      template={SONGS_TEMPLATE(Boolean(action))}
      // Clicking the open row closes the panel — tabs and rows toggle, they
      // do not trap.
      href={buildHref({ selected: isSelected ? undefined : song.id }, filters)}
      label={title}
      selected={isSelected}
      mobileMeta={mobileMeta || undefined}
    >
      <DataListTitle>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <AlbumThumb songId={song.id} coverImageUrl={song.cover_image_url} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block' }}>{title}</span>
            {titleMeta && <span style={titleMetaStyle}>{titleMeta}</span>}
          </span>
        </span>
      </DataListTitle>
      <DataListCell>{song.author || '—'}</DataListCell>
      <DataListCell mono>{song.level ? levelLabel(song.level, t) : '—'}</DataListCell>
      <DataListCell mono>{song.key || '—'}</DataListCell>
      <DataListCell mono>{learnerSummary?.count ?? 0}</DataListCell>
      <DataListCell>
        {learnerSummary ? <MasteryBar percent={learnerSummary.avgMastery} /> : '—'}
      </DataListCell>
      <DataListCell mono>{formatAdded(song.created_at)}</DataListCell>
      {action && <DataListActionCell testId="song-row-action">{action}</DataListActionCell>}
    </DataListRow>
  );
};
