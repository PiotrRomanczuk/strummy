'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SongAudioWaveform } from './SongAudioPlayer.Waveform';
import { songGhostButton } from './song-hero.styles';

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
 * Real audio playback (play/pause, seek, speed, loop) in the Claude Design
 * strip. The waveform is a stylised progress bar, not decoded audio.
 * Renders nothing when the song has no audio_files yet.
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

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      data-testid="song-audio-player"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto auto',
        alignItems: 'center',
        gap: 18,
        padding: '14px 18px',
        border: '1px solid var(--rule)',
        borderRadius: 12,
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
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--ink)',
          color: 'var(--paper)',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
        }}
      >
        {isPlaying ? (
          <Pause size={16} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" />
        )}
      </button>
      <SongAudioWaveform
        progress={progress}
        duration={duration}
        currentTime={currentTime}
        onSeek={handleSeek}
      />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
        <span style={{ color: 'var(--ink)' }}>{formatTime(currentTime)}</span> /{' '}
        {formatTime(duration)}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            data-testid={s === 1 ? 'audio-speed-toggle' : 'audio-speed-slow'}
            aria-pressed={speed === s}
            onClick={() => setSpeed(s)}
            title={t('audioSpeed')}
            style={{
              ...songGhostButton,
              padding: '6px 10px',
              borderColor: speed === s ? 'var(--gold-2)' : 'var(--rule)',
              color: speed === s ? 'var(--gold-2)' : 'var(--ink-2)',
            }}
          >
            {s}×
          </button>
        ))}
        <button
          type="button"
          data-testid="audio-loop-toggle"
          aria-pressed={loop}
          onClick={toggleLoop}
          title={t('loopAudio')}
          style={{
            ...songGhostButton,
            padding: '6px 10px',
            borderColor: loop ? 'var(--gold-2)' : 'var(--rule)',
            color: loop ? 'var(--gold-2)' : 'var(--ink-2)',
          }}
        >
          {t('loopAudio')}
        </button>
      </div>
    </div>
  );
};
