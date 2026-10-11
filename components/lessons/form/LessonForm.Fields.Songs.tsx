'use client';

import { useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';
import type { SongOption } from '@/lib/services/lesson-form-data';

type Props = {
  songs: SongOption[];
  songIds: string[];
  onSongIds: (v: string[]) => void;
};

/** The grid shows this many cards; past it, the filter box narrows the library. */
const GRID_LIMIT = 10;

const cardStyle = (isOn: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  border: `1px solid ${isOn ? 'var(--gold-2)' : 'var(--rule)'}`,
  background: isOn ? 'var(--gold-tint)' : 'var(--card)',
  textAlign: 'left',
  minWidth: 0,
  color: 'var(--ink)',
});

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

/** Section III — Claude Design "Songs to cover": two-column checkbox cards. */
export const LessonFormFieldsSongs = ({ songs, songIds, onSongIds }: Props) => {
  const t = useTranslations('Lessons');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const toggle = (id: string) =>
    onSongIds(songIds.includes(id) ? songIds.filter((x) => x !== id) : [...songIds, id]);

  const selected = songs.filter((song) => songIds.includes(song.id));
  const rest = songs
    .filter((song) => !songIds.includes(song.id))
    .filter((song) => !q || `${song.title} ${song.author ?? ''}`.toLowerCase().includes(q));
  const visible = [...selected, ...rest].slice(0, Math.max(GRID_LIMIT, selected.length));

  if (songs.length === 0) return <p style={s.hint}>{t('emptyLibraryHint')}</p>;

  return (
    <>
      {songs.length > GRID_LIMIT && (
        <input
          id="lesson-songs"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchSongsPlaceholder', { count: songs.length })}
          aria-label={t('searchSongsPlaceholder', { count: songs.length })}
          style={{ ...s.input, marginBottom: 10 }}
        />
      )}
      <div className="ui-form-row-2" style={{ gap: 8 }}>
        {visible.map((song) => {
          const isOn = songIds.includes(song.id);
          return (
            <button
              key={song.id}
              type="button"
              role="checkbox"
              data-testid="lesson-song-card"
              aria-checked={isOn}
              onClick={() => toggle(song.id)}
              style={cardStyle(isOn)}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  flex: '0 0 auto',
                  border: isOn ? 'none' : '1px solid var(--rule)',
                  background: isOn ? 'var(--gold-2)' : 'transparent',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {isOn && <Check size={10} strokeWidth={2.4} color="#fff" />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--serif)',
                    fontStyle: 'italic',
                    fontSize: 13,
                    fontWeight: 500,
                    ...ellipsis,
                  }}
                >
                  {song.title}
                </span>
                <span
                  style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', ...ellipsis }}
                >
                  {[song.author, song.musicalKey].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};
