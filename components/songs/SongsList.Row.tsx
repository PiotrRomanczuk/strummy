import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { Song } from '@/components/songs/types';
import type { SongLearnerSummary } from '@/lib/services/song-detail-queries';
import type { SongsListFilters } from '@/lib/services/songs-list-queries';

import { AlbumThumb } from './AlbumThumb';
import { MasteryBar } from './MasteryBar';
import { levelLabel } from './song-format.helpers';
import { buildHref } from './songs-list.helpers';
import {
  addedStyle,
  authorStyle,
  COLUMNS_CLASS,
  COLUMNS_WITH_ACTION_CLASS,
  formatAdded,
  keyStyle,
  learnersStyle,
  levelStyle,
  mobileMetaStyle,
  rowStyle,
  stretchedLinkStyle,
  titleMetaStyle,
  titleStyle,
  titleTextStyle,
  wrapperStyle,
} from './songs-row.styles';

export { COLUMNS_CLASS, COLUMNS_WITH_ACTION_CLASS };

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
    <div style={wrapperStyle(isSelected)}>
      <div
        className={`ui-row ${action ? COLUMNS_WITH_ACTION_CLASS : COLUMNS_CLASS}`}
        style={rowStyle}
      >
        <Link
          href={buildHref({ selected: isSelected ? undefined : song.id }, filters)}
          aria-label={title}
          aria-current={isSelected ? 'true' : undefined}
          style={stretchedLinkStyle}
        />
        <div style={titleStyle}>
          <AlbumThumb songId={song.id} coverImageUrl={song.cover_image_url} />
          <span style={{ minWidth: 0 }}>
            <span style={titleTextStyle}>{title}</span>
            {titleMeta && <span style={titleMetaStyle}>{titleMeta}</span>}
          </span>
        </div>
        {mobileMeta && (
          <div className="md:hidden" style={mobileMetaStyle}>
            {mobileMeta}
          </div>
        )}
        <div className="hidden md:block" style={authorStyle}>
          {song.author || '—'}
        </div>
        <div className="hidden md:block" style={levelStyle}>
          {song.level ? levelLabel(song.level, t) : '—'}
        </div>
        <div className="hidden md:block" style={keyStyle}>
          {song.key || '—'}
        </div>
        <div className="hidden md:block" style={learnersStyle}>
          {learnerSummary?.count ?? 0}
        </div>
        <div className="hidden md:block">
          {learnerSummary ? <MasteryBar percent={learnerSummary.avgMastery} /> : '—'}
        </div>
        <div className="hidden md:block" style={addedStyle}>
          {formatAdded(song.created_at)}
        </div>
        {action && (
          <div style={{ position: 'relative', textAlign: 'right' }} data-testid="song-row-action">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};
