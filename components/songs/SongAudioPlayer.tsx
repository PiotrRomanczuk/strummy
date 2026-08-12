'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  /** `songs.audio_files` — jsonb map of audio type to URL, or null/empty. */
  audioFiles: unknown;
};

const firstAudioUrl = (audioFiles: unknown): string | null => {
  if (!audioFiles || typeof audioFiles !== 'object' || Array.isArray(audioFiles)) return null;
  const values = Object.values(audioFiles as Record<string, unknown>);
  const url = values.find((v): v is string => typeof v === 'string' && v.length > 0);
  return url ?? null;
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const SPEEDS = [0.75, 1] as const;

/**
 * Real audio playback (play/pause, seek, speed, loop) — no waveform
 * rendering, since that needs client-side audio decoding this component
 * doesn't do. Renders nothing when the song has no audio_files yet.
 */
export const SongAudioPlayer = ({ audioFiles }: Props) => {
  const t = useTranslations('Songs');
  const url = firstAudioUrl(audioFiles);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  if (!url) return null;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const toggleSpeed = () => {
    setSpeed((prev) => (prev === 1 ? 0.75 : 1));
  };

  const toggleLoop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !audio.loop;
    setLoop(audio.loop);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
  };

  return (
    <div
      data-testid="song-audio-player"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        border: '1px solid var(--rule)',
        borderRadius: 10,
        background: 'var(--card)',
      }}
    >
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />

      <button
        type="button"
        data-testid="audio-play-toggle"
        aria-label={isPlaying ? t('pauseAudio') : t('playAudio')}
        onClick={togglePlay}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--ink)',
          color: 'var(--ivory)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>

      <input
        type="range"
        data-testid="audio-seek"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        style={{ flex: 1 }}
      />

      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <button
        type="button"
        data-testid="audio-speed-toggle"
        onClick={toggleSpeed}
        title={t('audioSpeed')}
        style={{
          padding: '4px 10px',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          background: speed !== 1 ? 'var(--paper)' : 'transparent',
          color: speed !== 1 ? 'var(--gold-2)' : 'var(--ink-3)',
          cursor: 'pointer',
          fontFamily: 'var(--mono)',
          fontSize: 11,
        }}
      >
        {speed}×
      </button>

      <button
        type="button"
        data-testid="audio-loop-toggle"
        aria-pressed={loop}
        onClick={toggleLoop}
        title={t('loopAudio')}
        style={{
          padding: '4px 10px',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          background: loop ? 'var(--paper)' : 'transparent',
          color: loop ? 'var(--gold-2)' : 'var(--ink-3)',
          cursor: 'pointer',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
        }}
      >
        {t('loopAudio')}
      </button>
    </div>
  );
};
