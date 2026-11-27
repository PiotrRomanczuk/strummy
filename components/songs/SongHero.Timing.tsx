import { getTranslations } from 'next-intl/server';

import type { Song } from '@/components/songs/types';
import { resolveSongTiming } from '@/lib/music-theory/song-tempo';
import { getSongTiming } from '@/lib/services/song-timing-queries';

import { msToClock } from './song-format.helpers';
import { SongTempoValue } from './SongTempoValue';

type Props = { song: Pick<Song, 'id' | 'tempo' | 'time_signature' | 'duration_ms'> };

const label = 'font-mono text-[9px] uppercase tracking-[.16em] text-[var(--ink-4)]';
const value = 'mt-0.5 font-mono text-sm font-medium text-[var(--ink-2)]';

/**
 * Tempo, metre and length in the song's hero. With an analysed recording, tempo and length are the recording's —
 * the same values as the song card (#1241); without one (or for a student, whom RLS shows no analysis), the
 * song's own.
 */
export const SongHeroTiming = async ({ song }: Props) => {
  const t = await getTranslations('Songs');
  const timing =
    (await getSongTiming(song.id)) ??
    resolveSongTiming({ tempo: song.tempo ?? null, durationMs: song.duration_ms ?? null }, null);
  const fromRecording = t('timingFromRecording');
  const duration =
    timing.durationSeconds === null ? '' : msToClock(Math.floor(timing.durationSeconds) * 1000);

  return (
    <>
      {timing.tempo && (
        <div title={timing.tempo.source === 'recording' ? fromRecording : undefined}>
          <div className={label}>{t('metaTempo')}</div>
          <div className={value}>
            <SongTempoValue tempo={timing.tempo} />
          </div>
        </div>
      )}
      {song.time_signature != null && (
        <div>
          <div className={label}>{t('metaTime')}</div>
          <div className={value}>{`${song.time_signature}/4`}</div>
        </div>
      )}
      {duration && (
        <div title={timing.lengthSource === 'recording' ? fromRecording : undefined}>
          <div className={label}>{t('metaLength')}</div>
          <div className={value} data-testid="song-length">
            {duration}
          </div>
        </div>
      )}
    </>
  );
};
