import { getTranslations } from 'next-intl/server';

import { getSongTranscription } from '@/lib/services/song-transcription-queries';

import { Card, CardHeader } from './SongPrimitives';
import { TranscriptionRoll } from './SongTranscriptionCard.Roll';

type Props = { songId: string };

/**
 * Staff-only: the song's bass line and vocal melody from song2logic's machine transcription of its recording
 * (SNG-12), drawn on the recording's real bars. Fetches its own data (like SongChordSourcesCard); RLS returns
 * nothing to a student, and the card is gone when neither track has notes.
 */
export const SongTranscriptionCard = async ({ songId }: Props) => {
  const transcription = await getSongTranscription(songId);
  if (!transcription) return null;
  const { bass, vocals } = transcription;
  if (bass.notes.length === 0 && vocals.notes.length === 0) return null;

  const t = await getTranslations('Songs');

  return (
    <Card>
      <CardHeader eyebrow={t('transcriptionEyebrow')} title={t('transcriptionTitle')} />
      <div className="flex flex-col gap-3 px-6 pb-6 text-sm text-[var(--ink-2)]">
        <p className="text-xs text-[var(--ink-3)]">{t('transcriptionMachine')}</p>
        <TranscriptionRoll bars={transcription.bars} bass={bass} vocals={vocals} />
        <a
          href={transcription.recordingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-xs font-medium text-[var(--ink)] underline underline-offset-2"
        >
          {t('transcriptionSource', { date: transcription.transcribedOn ?? '—' })}
        </a>
      </div>
    </Card>
  );
};
