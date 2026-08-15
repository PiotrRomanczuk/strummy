import { getTranslations } from 'next-intl/server';

import { ListDetailPanel } from '@/components/shared/ListDetailPanel';
import type { Song } from '@/components/songs/types';
import { getSongLearners, getSongUsageStats } from '@/lib/services/song-detail-queries';
import type { SongsListFilters } from '@/lib/services/songs-list-queries';

import { LearnersCard, UsageCard } from './SongSidebar';
import { SongsListPanelHero } from './SongsList.Panel.Hero';
import { buildHref } from './songs-list.helpers';
import { WantToLearnButton } from './WantToLearnButton';

type Props = {
  song: Song;
  filters: SongsListFilters;
  untitledFallback: string;
  /** Student viewer only — mirrors the row's own action cell. */
  canPickToLearn: boolean;
  isInRepertoire: boolean;
};

/** Slide-in song detail — a lighter view of `SongDetail.tsx` for browsing without leaving the list. */
export const SongsListPanel = async ({
  song,
  filters,
  untitledFallback,
  canPickToLearn,
  isInRepertoire,
}: Props) => {
  const t = await getTranslations('Songs');
  const [usage, learners] = await Promise.all([
    getSongUsageStats(song.id),
    getSongLearners(song.id),
  ]);

  const title = song.title || untitledFallback;

  return (
    <ListDetailPanel
      label={t('panelLabel', { title })}
      eyebrow={t('heroEyebrow')}
      fullPageHref={`/dashboard/songs/${song.id}`}
      closeHref={buildHref({ selected: undefined }, filters)}
      labels={{ openFullPage: t('openFullPage'), close: t('closePanel') }}
    >
      <SongsListPanelHero song={song} title={title} t={t} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <UsageCard stats={usage} />
        <LearnersCard learners={learners} />
      </div>

      {canPickToLearn && (
        <div style={{ marginTop: 18 }}>
          <WantToLearnButton
            songId={song.id}
            initial={isInRepertoire ? { kind: 'added-locked' } : { kind: 'absent' }}
          />
        </div>
      )}
    </ListDetailPanel>
  );
};
