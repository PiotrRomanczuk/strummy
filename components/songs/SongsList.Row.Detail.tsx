import type { CSSProperties } from 'react';

import type { Song } from '@/components/songs/types';

import { msToClock } from './song-format.helpers';

const detailPanelStyle: CSSProperties = {
  padding: '4px 20px 16px 46px',
  display: 'flex',
  gap: 20,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const metaLabelStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 9,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.16em',
};

const metaValueStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 13,
  color: 'var(--ink-2)',
  fontWeight: 500,
  marginTop: 2,
};

const tagStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  padding: '4px 9px',
  background: 'var(--paper)',
  border: '1px solid var(--rule)',
  borderRadius: 99,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '.1em',
};

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div style={metaLabelStyle}>{label}</div>
    <div style={metaValueStyle}>{value}</div>
  </div>
);

/** Has the song got anything worth an expand toggle in the first place? */
export const songHasExpandableDetails = (song: Song): boolean =>
  Boolean(song.category) ||
  (song.capo_fret != null && song.capo_fret > 0) ||
  song.tempo != null ||
  song.time_signature != null ||
  Boolean(msToClock(song.duration_ms ?? null)) ||
  Boolean(song.strumming_pattern);

export const SongRowDetail = ({
  song,
  t,
}: {
  song: Song;
  t: (key: string, values?: Record<string, string | number>) => string;
}) => {
  const duration = msToClock(song.duration_ms ?? null);

  return (
    <div style={detailPanelStyle} data-testid="song-row-details">
      {song.capo_fret != null && song.capo_fret > 0 && (
        <Meta label={t('metaCapo')} value={t('capoFret', { fret: song.capo_fret })} />
      )}
      {song.tempo != null && (
        <Meta label={t('metaTempo')} value={t('tempoBpm', { tempo: song.tempo })} />
      )}
      {song.time_signature != null && (
        <Meta label={t('metaTime')} value={`${song.time_signature}/4`} />
      )}
      {duration && <Meta label={t('metaLength')} value={duration} />}
      {(song.category || song.strumming_pattern) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {song.category && <span style={tagStyle}>{song.category}</span>}
          {song.strumming_pattern && (
            <span style={tagStyle}>{t('strumTag', { pattern: song.strumming_pattern })}</span>
          )}
        </div>
      )}
    </div>
  );
};
