import { getTranslations } from 'next-intl/server';

import type { ChordShape } from '@/lib/music-theory/chord-shape';

import { SongChordsCardNewForYou } from './SongChordsCard.NewForYou';
import { Card, CardHeader, ChordGrid } from './SongPrimitives';

type Props = {
  title: string;
  chordTokens: string[];
  /** A student's shapes new in this song; null hides the line (staff, feature off). */
  newShapes?: ChordShape[] | null;
};

export const SongChordsCard = async ({ title, chordTokens, newShapes = null }: Props) => {
  const t = await getTranslations('Songs');
  if (chordTokens.length === 0) {
    return (
      <Card>
        <CardHeader eyebrow={t('chordsEyebrow')} title={t('chordsTitle')} />
        <div
          style={{
            padding: '0 24px 28px',
            fontStyle: 'italic',
            color: 'var(--ink-4)',
            fontFamily: 'var(--serif)',
            fontSize: 14,
          }}
        >
          {t('noChordChart')}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        eyebrow={t('chordsEyebrow')}
        title={
          <>
            {t('chordsInTitlePrefix')}{' '}
            <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>{title}</em>
          </>
        }
      />
      {newShapes && <SongChordsCardNewForYou shapes={newShapes} />}
      <div
        style={{
          padding: '0 24px 22px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: 14,
        }}
      >
        {chordTokens.map((c) => (
          <div
            key={c}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '10px 4px',
              border: '1px solid var(--rule)',
              borderRadius: 8,
              background: 'var(--paper)',
            }}
          >
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 500 }}>{c}</div>
            <ChordGrid name={c} size={56} />
          </div>
        ))}
      </div>
    </Card>
  );
};
