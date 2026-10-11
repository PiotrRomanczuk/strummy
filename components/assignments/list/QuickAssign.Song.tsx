'use client';

import type { SongOption } from '@/lib/services/lesson-form-data';

/** The song row-card; a transparent native select on top does the picking. */
export const QaSong = ({
  songs,
  songId,
  placeholder,
  onSongId,
}: {
  songs: SongOption[];
  songId: string;
  placeholder: string;
  onSongId: (v: string) => void;
}) => {
  const song = songs.find((s) => s.id === songId);
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        border: '1px solid var(--rule)',
        borderRadius: 6,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          background: 'linear-gradient(135deg, var(--gold-dim), var(--gold-2))',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--on-accent)',
          fontFamily: 'var(--serif)',
          fontSize: 10,
          fontWeight: 500,
        }}
      >
        {song?.musicalKey ?? song?.title[0] ?? '♪'}
      </div>
      <span
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 14,
          fontStyle: 'italic',
          color: song ? 'var(--ink)' : 'var(--ink-4)',
        }}
      >
        {song?.title ?? placeholder}
      </span>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          marginLeft: 'auto',
        }}
      >
        {song?.author ?? ''}
      </span>
      <select
        id="assignment-song"
        aria-label={placeholder}
        value={songId}
        onChange={(e) => onSongId(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
      >
        <option value="">{placeholder}</option>
        {songs.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
            {s.author ? ` — ${s.author}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
