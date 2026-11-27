import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';

import { recordingTempo } from '@/lib/music-theory/song-tempo';
import { splitKey } from '@/lib/music-theory/song-map';
import { getSongMap } from '@/lib/services/song-segments-queries';
import { getSongTiming } from '@/lib/services/song-timing-queries';

import { Card, CardHeader } from './SongPrimitives';
import { SongMapParts } from './SongMapCard.Parts';
import { SongTempoValue } from './SongTempoValue';

type Props = { songId: string };

/**
 * Staff-only: the song part by part as song2logic heard it in the recording (SNG-16) — the form as a strip, and
 * for the picked part its chords, drum groove and bass riff. Fetches its own data (like SongTranscriptionCard);
 * RLS returns nothing to a student, and the card is gone when the song has no segments.
 */
export const SongMapCard = async ({ songId }: Props) => {
  const [map, timing] = await Promise.all([getSongMap(songId), getSongTiming(songId)]);
  if (!map) return null;

  const t = await getTranslations('Songs');
  const tc = await getTranslations('SongCard');
  const format = await getFormatter();
  const { tonic, isMinor } = splitKey(map.songKey);
  // The song's one tempo and analysis date (#1241); the parts' own run only when the song has no analysis row.
  const tempo =
    timing?.tempo?.source === 'recording'
      ? timing.tempo
      : recordingTempo({
          recordingBpm: map.bpm,
          feltBpm: map.feltBpm,
          songBpm: timing?.tempo?.bpm ?? null,
        });
  const analysedOn = timing?.analysedOn ?? map.analysedOn;
  const summary = [
    t(isMinor ? 'mapKeyMinor' : 'mapKeyMajor', { tonic }),
    `${map.beatsPerBar}/4`,
    t('mapPartCount', { count: map.parts.length }),
  ];

  return (
    <Card>
      <CardHeader eyebrow={t('mapEyebrow')} title={t('mapTitle')} />
      <div className="flex flex-col gap-3 px-6 pb-6 text-sm text-[var(--ink-2)]">
        <p className="font-mono text-xs text-[var(--ink-3)]">
          <SongTempoValue tempo={tempo} />
          {` · ${summary.join(' · ')}`}
        </p>
        <p className="text-xs text-[var(--ink-3)]">{t('mapMachine')}</p>
        <SongMapParts parts={map.parts} beatsPerBar={map.beatsPerBar} tempoScale={tempo.scale} />
        <a
          href={map.recordingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-xs font-medium text-[var(--ink)] underline underline-offset-2"
        >
          {t('mapSource', {
            date: analysedOn ? format.dateTime(new Date(analysedOn), { dateStyle: 'medium' }) : '—',
          })}
        </a>
        <Link
          href={`/dashboard/songs/${songId}/card`}
          className="self-start text-sm font-medium text-[var(--gold-2)] underline underline-offset-2"
        >
          {tc('openCard')}
        </Link>
      </div>
    </Card>
  );
};
