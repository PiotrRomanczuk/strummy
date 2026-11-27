import { getTranslations } from 'next-intl/server';

import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';
import type { SongDetail } from '@/lib/repertoire-stats/song-progressions';

import { RepertoireStatsProgressionRanking } from './RepertoireStats.ProgressionRanking';
import { RepertoireStatsSongPicker } from './RepertoireStats.SongPicker';
import { RepertoireStatsSongProgressions } from './RepertoireStats.SongProgressions';
import { StatsCard } from './RepertoireStatsPrimitives';
import type { StatsParams } from './repertoire-stats.helpers';
import { keyLabel } from './repertoire-stats.i18n';

type Props = { songs: RepertoireSong[]; params: StatsParams; detail: SongDetail | null };

/** "Which progressions do we play?": the repertoire's ranking beside one song in detail. */
export async function RepertoireStatsProgressions({ songs, params, detail }: Props) {
  const t = await getTranslations('RepertoireStats');
  const analysed = songs.filter((song) => song.measured);
  const song = analysed.find((candidate) => candidate.id === params.song) ?? null;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
      <RepertoireStatsProgressionRanking songs={songs} params={params} />
      <StatsCard className="p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <RepertoireStatsSongPicker
            params={params}
            options={analysed.map(({ id, title, author }) => ({ id, title, author }))}
            selected={song ? { id: song.id, title: song.title, author: song.author } : null}
          />
          {song?.measured && (
            <span className="font-mono text-[var(--ink-3)]">
              {[
                keyLabel(song.measured.key, params.names, t),
                song.measured.beatsPerBar
                  ? t('overview.beats', { beats: song.measured.beatsPerBar })
                  : null,
                song.measured.bpm ? t('bpm', { value: Math.round(song.measured.bpm) }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </div>
        {song ? (
          <RepertoireStatsSongProgressions song={song} detail={detail} params={params} />
        ) : (
          <p className="py-6 text-center text-[var(--ink-3)]">{t('progressions.pickSong')}</p>
        )}
      </StatsCard>
    </div>
  );
}
