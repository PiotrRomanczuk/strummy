import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { splitKey } from '@/lib/music-theory/song-map';
import { getSongMap } from '@/lib/services/song-segments-queries';

import { Card, CardHeader } from './SongPrimitives';
import { SongMapParts } from './SongMapCard.Parts';

type Props = { songId: string };

/**
 * Staff-only: the song part by part as song2logic heard it in the recording (SNG-16) — the form as a strip, and
 * for the picked part its chords, drum groove and bass riff. Fetches its own data (like SongTranscriptionCard);
 * RLS returns nothing to a student, and the card is gone when the song has no segments.
 */
export const SongMapCard = async ({ songId }: Props) => {
  const map = await getSongMap(songId);
  if (!map) return null;

  const t = await getTranslations('Songs');
  const tc = await getTranslations('SongCard');
  const { tonic, isMinor } = splitKey(map.songKey);
  const summary = [
    map.feltBpm === null
      ? t('mapTempo', { bpm: Math.round(map.bpm) })
      : t('mapTempoFelt', { bpm: Math.round(map.bpm), felt: Math.round(map.feltBpm) }),
    t(isMinor ? 'mapKeyMinor' : 'mapKeyMajor', { tonic }),
    `${map.beatsPerBar}/4`,
    t('mapPartCount', { count: map.parts.length }),
  ];

  return (
    <Card>
      <CardHeader eyebrow={t('mapEyebrow')} title={t('mapTitle')} />
      <div className="flex flex-col gap-3 px-6 pb-6 text-sm text-[var(--ink-2)]">
        <p className="font-mono text-xs text-[var(--ink-3)]">{summary.join(' · ')}</p>
        <p className="text-xs text-[var(--ink-3)]">{t('mapMachine')}</p>
        <SongMapParts parts={map.parts} beatsPerBar={map.beatsPerBar} />
        <a
          href={map.recordingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-xs font-medium text-[var(--ink)] underline underline-offset-2"
        >
          {t('mapSource', { date: map.analysedOn ?? '—' })}
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
