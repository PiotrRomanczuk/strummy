'use client';

import { useTranslations } from 'next-intl';

// Rounded to whole pixels: server and browser trig differ in the last float
// digits, and an unrounded height made every bar a hydration mismatch.
const BARS = Array.from({ length: 64 }, (_, i) =>
  Math.round(8 + Math.abs(Math.sin(i * 0.5) + Math.cos(i * 0.13)) * 14)
);

/**
 * The mockup's waveform: 64 bars, gold up to the play head. A transparent
 * range input on top does the seeking, so it stays keyboard-accessible.
 */
export const SongAudioWaveform = ({
  progress,
  duration,
  currentTime,
  onSeek,
}: {
  progress: number;
  duration: number;
  currentTime: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const t = useTranslations('Songs');
  const played = Math.round(progress * BARS.length);
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        height: 36,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {BARS.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            flex: '0 0 3px',
            height: h,
            background: i < played ? 'var(--gold-2)' : 'var(--ink-5)',
            borderRadius: 1,
          }}
        />
      ))}
      <input
        type="range"
        data-testid="audio-seek"
        aria-label={t('audioSeek')}
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={onSeek}
        style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer' }}
      />
    </div>
  );
};
