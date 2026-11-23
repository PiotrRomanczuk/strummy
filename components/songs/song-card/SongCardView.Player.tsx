'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { cardSection, eyebrow, hint } from './song-card.styles';
import type { YouTubeClock } from './useYouTubeClock';

// The YouTube element only exists in the browser.
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

type Props = {
  youtubeId: string | null;
  status: YouTubeClock['status'];
  isPlaying: boolean;
  rate: number;
  events: YouTubeClock['playerEvents'];
  /** Callback ref for the player element (the clock listens to it). */
  attach: YouTubeClock['attachPlayer'];
};

/**
 * The analysed recording, embedded from YouTube — the only sound of the card and its clock. The privacy-enhanced
 * domain sets no cookies until the viewer plays. A video its owner keeps off other sites shows a way to YouTube.
 */
export const SongCardPlayer = ({ youtubeId, status, isPlaying, rate, events, attach }: Props) => {
  const t = useTranslations('SongCard');
  const watchUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null;

  if (!youtubeId || status === 'unavailable') {
    return (
      <section aria-label={t('playerTitle')} className={cardSection}>
        <div className="grid aspect-video content-center gap-2.5 rounded-[10px] border border-[var(--rule)] bg-[var(--paper)] px-6 py-5">
          <span className={eyebrow}>{t('unavailableEyebrow')}</span>
          <p className="font-serif text-[22px] leading-tight text-[var(--ink)]">
            {t(youtubeId ? 'unavailableTitle' : 'noRecordingTitle')}
          </p>
          <p className={`${hint} max-w-[46ch]`}>{t('unavailableBody')}</p>
          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="justify-self-start rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--ink-2)] hover:bg-[var(--rule-2)]"
            >
              {t('openOnYouTube')}
            </a>
          )}
        </div>
      </section>
    );
  }

  return (
    <section aria-label={t('playerTitle')} className={cardSection}>
      <div className="relative aspect-video overflow-hidden rounded-[10px] bg-black">
        <ReactPlayer
          ref={attach}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          playing={isPlaying}
          playbackRate={rate}
          controls
          width="100%"
          height="100%"
          className="absolute inset-0"
          {...events}
        />
      </div>
    </section>
  );
};
