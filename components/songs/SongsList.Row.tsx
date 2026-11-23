import { getTranslations } from 'next-intl/server';

import { DataListActionCell, DataListRow, DataListTitle } from '@/components/shared/DataList';
import type { Song } from '@/components/songs/types';
import type { SongLearnerSummary } from '@/lib/services/song-detail-queries';
import type { SongsListFilters } from '@/lib/services/songs-list-queries';

import { AlbumThumb } from './AlbumThumb';
import { MasteryBar } from './MasteryBar';
import { SongRowCells } from './SongsList.Row.Cells';
import { buildHref } from './songs-list.helpers';
import { SONGS_TEMPLATE, titleMetaStyle } from './songs-row.styles';

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
  // Any open panel narrows the table, not just this row's.
  const isCompact = Boolean(filters.selected);
  // Design "Song List Mobile" pairs artist with key on the collapsed row; level
  // moves into the detail sheet, where there is room to label it.
  const mobileMeta = [song.author, song.key].filter(Boolean).join(' · ');
  const titleMeta = [song.category, song.release_year].filter(Boolean).join(' · ');

  return (
    <DataListRow
      template={SONGS_TEMPLATE(Boolean(action), isCompact)}
      // Clicking the open row closes the panel — tabs and rows toggle, they
      // do not trap.
      href={buildHref({ selected: isSelected ? undefined : song.id }, filters)}
      label={title}
      selected={isSelected}
      mobileMeta={mobileMeta || undefined}
      mobileSplit
      dense
      // Always rendered, mirroring the desktop columns: a student sees no
      // learner summary (RLS scopes it to staff), and a row that silently loses
      // its trailing block on some viewers reads as a different component.
      mobileTrail={
        <>
          {learnerSummary && (
            <>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                {learnerSummary.avgMastery}%
              </span>
              <MasteryBar percent={learnerSummary.avgMastery} barOnly />
            </>
          )}
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
            {t('learnersShort', { count: learnerSummary?.count ?? 0 })}
          </span>
        </>
      }
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
      <SongRowCells song={song} learnerSummary={learnerSummary} compact={isCompact} />
      {action && <DataListActionCell testId="song-row-action">{action}</DataListActionCell>}
    </DataListRow>
  );
};
