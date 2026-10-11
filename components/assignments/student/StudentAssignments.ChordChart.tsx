import { getTranslations } from 'next-intl/server';

import { ChordDiagram } from '@/components/skills/chord-quiz/ChordDiagram';
import { DesignCard, DesignCardBody, DesignCardHeader } from '@/components/shared/DesignCard';
import { CHORD_VOICINGS } from '@/lib/music-theory/chord-voicings';

/** "Reference / Chord chart" — the drill's chords, else the song's, as diagrams. */
export const StudentChordChart = async ({
  chordIds,
  songChords,
}: {
  chordIds: string[];
  songChords: string | null;
}) => {
  const t = await getTranslations('Assignments');
  const fromDrill = chordIds.map((id) => CHORD_VOICINGS.find((v) => v.id === id)).filter(Boolean);
  const fromSong = (songChords ?? '')
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((name) => CHORD_VOICINGS.find((v) => v.name.toLowerCase() === name.toLowerCase()))
    .filter(Boolean);
  const voicings = (fromDrill.length > 0 ? fromDrill : fromSong).slice(0, 6);
  if (voicings.length === 0) return null;
  return (
    <DesignCard>
      <DesignCardHeader
        eyebrow={t('studentReferenceEyebrow')}
        title={t('studentChordChartTitle')}
      />
      <DesignCardBody style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {voicings.map((v) => (
          <div
            key={v!.id}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
          >
            <ChordDiagram voicing={v!} size="xs" />
          </div>
        ))}
      </DesignCardBody>
    </DesignCard>
  );
};
