import { getLocale, getTranslations } from 'next-intl/server';

import { DataListCell } from '@/components/shared/DataList';
import type { Song } from '@/components/songs/types';
import type { SongLearnerSummary } from '@/lib/services/song-detail-queries';

import { MasteryBar } from './MasteryBar';
import { SongLevelPill } from './SongsList.LevelPill';
import { levelLabel } from './song-format.helpers';
import { formatAdded } from './songs-row.styles';

/**
 * The desktop-only columns of a song row, in `SONGS_TEMPLATE` order.
 *
 * `compact` drops mastery and the added date — the two columns the open detail
 * panel repeats — so the title keeps its width beside the panel.
 */
export const SongRowCells = async ({
  song,
  learnerSummary,
  compact,
}: {
  song: Song;
  learnerSummary?: SongLearnerSummary;
  compact: boolean;
}) => {
  const [t, locale] = await Promise.all([getTranslations('Songs'), getLocale()]);

  return (
    <>
      <DataListCell>{song.author || '—'}</DataListCell>
      <DataListCell>
        {song.level ? <SongLevelPill level={song.level} label={levelLabel(song.level, t)} /> : '—'}
      </DataListCell>
      <DataListCell mono align="center">
        {song.key ? <span className="font-medium text-[var(--ink)]">{song.key}</span> : '—'}
      </DataListCell>
      <DataListCell mono align="right">
        {learnerSummary?.count ?? 0}
      </DataListCell>
      {!compact && (
        <DataListCell align="right">
          {learnerSummary ? <MasteryBar percent={learnerSummary.avgMastery} /> : '—'}
        </DataListCell>
      )}
      {!compact && (
        <DataListCell mono align="right">
          <span className="text-[11.5px] text-[var(--ink-4)]">
            {formatAdded(song.created_at, locale)}
          </span>
        </DataListCell>
      )}
    </>
  );
};
