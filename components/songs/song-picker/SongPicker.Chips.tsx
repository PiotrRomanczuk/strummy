'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SongOption } from '@/lib/services/lesson-form-data';

type Props = {
  songs: SongOption[];
  disabled?: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
};

/** The current selection, kept visible while the list below is being filtered. */
export const SongPickerChips = ({ songs, disabled, onRemove, onClear }: Props) => {
  const t = useTranslations('Songs');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {songs.map((song) => {
        const title = song.title || t('untitledFallback');
        return (
          <span
            key={song.id}
            className="ui-song-chip"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              maxWidth: '100%',
              padding: '4px 5px 4px 10px',
              borderRadius: 999,
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 13,
            }}
          >
            <span
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={song.author ? `${song.title} — ${song.author}` : song.title}
            >
              {title}
            </span>
            <button
              type="button"
              className="ui-song-chip-x"
              disabled={disabled}
              aria-label={t('pickerRemoveAria', { title })}
              onClick={() => onRemove(song.id)}
              style={{
                display: 'inline-flex',
                padding: 2,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        );
      })}
      <button
        type="button"
        className="ui-chip"
        disabled={disabled}
        onClick={onClear}
        style={{
          marginLeft: 2,
          border: 'none',
          background: 'transparent',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {t('pickerClearAll')}
      </button>
    </div>
  );
};
