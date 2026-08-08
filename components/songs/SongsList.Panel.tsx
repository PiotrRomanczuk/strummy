import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { Song } from '@/components/songs/types';
import { getSongLearners, getSongUsageStats } from '@/lib/services/song-detail-queries';
import type { SongsListFilters } from '@/lib/services/songs-list-queries';

import { LearnersCard, UsageCard } from './SongSidebar';
import { SongsListPanelHero } from './SongsList.Panel.Hero';
import { buildHref } from './songs-list.helpers';
import { WantToLearnButton } from './WantToLearnButton';

const closeLinkStyle = {
  padding: '5px 8px',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  color: 'var(--ink-3)',
  textDecoration: 'none',
};

const openLinkStyle = {
  ...closeLinkStyle,
  padding: '5px 10px',
  fontSize: 11.5,
  fontFamily: 'var(--sans)',
};

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
    <aside
      className="songs-panel-slide-in"
      aria-label={t('panelLabel', { title })}
      style={{
        flex: '0 0 340px',
        borderLeft: '1px solid var(--rule)',
        background: 'var(--paper)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '.14em',
            }}
          >
            {t('heroEyebrow')}
          </span>
          <div style={{ flex: 1 }} />
          <Link href={`/dashboard/songs/${song.id}`} style={openLinkStyle}>
            {t('openFullPage')}
          </Link>
          <Link
            href={buildHref({ selected: undefined }, filters)}
            aria-label={t('closePanel')}
            style={closeLinkStyle}
          >
            ✕
          </Link>
        </div>

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
      </div>
    </aside>
  );
};
