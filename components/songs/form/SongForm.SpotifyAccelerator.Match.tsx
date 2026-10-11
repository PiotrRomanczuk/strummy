'use client';

import { useTranslations } from 'next-intl';

import type { SearchResult } from './SongForm.SpotifyAccelerator';

const formatDuration = (ms: number): string => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** The matched-track row under the accelerator: art, name, year · length, AUTO-FILLED. */
export const SpotifyMatchCard = ({ matched }: { matched: SearchResult }) => {
  const t = useTranslations('Songs');
  return (
    <div
      style={{
        marginTop: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
      }}
    >
      {matched.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Spotify album art
        <img src={matched.coverUrl} alt="" width={40} height={40} style={{ borderRadius: 4 }} />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #b84a3a, #c89523)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--on-accent)',
            fontFamily: 'var(--serif)',
            fontSize: 14,
          }}
        >
          {initials(matched.name)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {matched.name}{' '}
          <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>· {matched.artist}</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-4)',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
          }}
        >
          {[matched.release_date?.slice(0, 4), formatDuration(matched.duration_ms)]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      <span
        style={{
          padding: '3px 8px',
          borderRadius: 999,
          background: 'var(--gold-tint)',
          color: 'var(--gold-2)',
          fontSize: 11,
          fontFamily: 'var(--mono)',
        }}
      >
        {t('formSpotifyAutoFilled')}
      </span>
    </div>
  );
};
