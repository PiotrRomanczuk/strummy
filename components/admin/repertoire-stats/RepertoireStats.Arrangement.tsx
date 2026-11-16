import Link from 'next/link';
import { Info, X } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { MAX_ARRANGEMENT_SONGS, arrangementOf } from '@/lib/repertoire-stats/arrangement';
import { byStudents } from '@/lib/repertoire-stats/mismatch-list';
import type { RepertoireSong } from '@/lib/repertoire-stats/repertoire-song';

import { RepertoireStatsTrackTile, type ArrangementSong } from './RepertoireStats.TrackTile';
import { StatsLabel } from './RepertoireStatsPrimitives';
import { statsHref, toggleId, type StatsParams } from './repertoire-stats.helpers';
import { decimal } from './repertoire-stats.i18n';

type Props = { songs: RepertoireSong[]; params: StatsParams };

const LETTERS = ['A', 'B', 'C'];
const BARS = ['bg-[var(--ink-4)]', 'bg-[var(--ink)]', 'bg-[var(--gold)]'];

/** "What plays in the song?": every transcribed track of up to three songs, against the transcribed repertoire. */
export async function RepertoireStatsArrangement({ songs, params }: Props) {
  const [t, locale] = await Promise.all([getTranslations('RepertoireStats'), getLocale()]);
  const transcribed = songs.filter((song) => song.transcription).sort(byStudents);
  const chosen = params.arrangement
    .map((id) => transcribed.find((song) => song.id === id))
    .filter((song): song is RepertoireSong => !!song);
  const selected = chosen.length ? chosen : transcribed.slice(0, MAX_ARRANGEMENT_SONGS);
  const marked: ArrangementSong[] = selected.map((song, i) => ({
    letter: LETTERS[i],
    title: song.title,
    bar: BARS[i],
  }));
  const ids = selected.map((song) => song.id);
  const labels = {
    plays: t('arrangement.plays'),
    perBar: t('arrangement.perBar'),
    range: t('arrangement.range'),
    silent: t('arrangement.silent'),
    repertoire: t('arrangement.repertoire'),
  };
  if (transcribed.length === 0) {
    return <p className="py-10 text-center text-[var(--ink-3)]">{t('arrangement.none')}</p>;
  }
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        {selected.map((song, i) => (
          <Link
            key={song.id}
            href={statsHref(params, { arrangement: ids.filter((id) => id !== song.id) })}
            scroll={false}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--card)] px-3 py-1.5 text-[13px]"
          >
            <span className="font-mono font-medium">{LETTERS[i]}</span>
            <i className={`h-[5px] w-3.5 rounded-full ${BARS[i]}`} />
            {song.title}
            <X
              aria-label={t('arrangement.remove', { title: song.title })}
              className="size-3 text-[var(--ink-4)]"
            />
          </Link>
        ))}
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--gold-2)]">
          <Info aria-hidden className="size-3.5" />
          {t('arrangement.background', { count: transcribed.length })}
        </span>
      </div>
      <p className="mb-4 text-[var(--ink-3)]">{t('arrangement.howToRead')}</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {arrangementOf(transcribed, selected).map((profile) => (
          <RepertoireStatsTrackTile
            key={profile.track}
            profile={profile}
            songs={marked}
            names={params.names}
            labels={labels}
            format={(value) => decimal(value, locale)}
          />
        ))}
        <TranscribedSongs
          songs={transcribed}
          ids={ids}
          params={params}
          label={t('arrangement.transcribed', { count: transcribed.length })}
        />
      </div>
    </div>
  );
}

/** Every transcribed song: a chosen one in ink, the others as links that add them. */
function TranscribedSongs({
  songs,
  ids,
  params,
  label,
}: {
  songs: RepertoireSong[];
  ids: string[];
  params: StatsParams;
  label: string;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--rule)] p-4 text-[var(--ink-3)]">
      <StatsLabel className="mb-2">{label}</StatsLabel>
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {songs.map((song) => (
          <Link
            key={song.id}
            href={statsHref(params, { arrangement: toggleId(ids, song.id, MAX_ARRANGEMENT_SONGS) })}
            scroll={false}
            className={
              ids.includes(song.id) ? 'font-medium text-[var(--ink)]' : 'text-[var(--gold-2)]'
            }
          >
            {song.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
