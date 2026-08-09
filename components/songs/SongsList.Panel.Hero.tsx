import type { Song } from '@/components/songs/types';

import { AlbumThumb } from './AlbumThumb';
import { levelLabel, msToClock } from './song-format.helpers';

const statBox = {
  padding: '8px 6px',
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  textAlign: 'center' as const,
};

const tagStyle = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  padding: '4px 9px',
  background: 'var(--paper)',
  border: '1px solid var(--rule)',
  borderRadius: 99,
  color: 'var(--ink-3)',
  textTransform: 'uppercase' as const,
  letterSpacing: '.08em',
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div style={statBox}>
    <div
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 8.5,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '.12em',
      }}
    >
      {label}
    </div>
    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, marginTop: 2 }}>
      {value}
    </div>
  </div>
);

type Props = {
  song: Song;
  title: string;
  t: (key: string, values?: Record<string, string | number>) => string;
};

/** Cover art, title/author, key meta grid, and level/category/strum tags. */
export const SongsListPanelHero = ({ song, title, t }: Props) => {
  const tags = [song.category, song.strumming_pattern].filter(Boolean) as string[];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <AlbumThumb songId={song.id} coverImageUrl={song.cover_image_url} size={280} radius={10} />
      </div>

      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--gold-2)',
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          marginBottom: 4,
        }}
      >
        {[song.category, song.release_year].filter(Boolean).join(' · ') || t('heroEyebrow')}
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 24,
          fontStyle: 'italic',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}
      >
        {title}
      </div>
      {song.author && (
        <div
          style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink-3)', marginTop: 4 }}
        >
          {song.author}
        </div>
      )}

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '16px 0' }}
      >
        <Stat label={t('metaKey')} value={song.key || '—'} />
        <Stat
          label={t('metaCapo')}
          value={song.capo_fret ? t('capoFret', { fret: song.capo_fret }) : '—'}
        />
        <Stat
          label={t('metaTempo')}
          value={song.tempo ? t('tempoBpm', { tempo: song.tempo }) : '—'}
        />
        <Stat label={t('metaLength')} value={msToClock(song.duration_ms) || '—'} />
      </div>

      {(song.level || tags.length > 0) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {song.level && (
            <span style={{ ...tagStyle, color: 'var(--ink-2)' }}>{levelLabel(song.level, t)}</span>
          )}
          {tags.map((tag) => (
            <span key={tag} style={tagStyle}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );
};
