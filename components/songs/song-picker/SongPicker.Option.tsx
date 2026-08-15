'use client';

import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';

import { levelLabel } from '@/components/songs/song-format.helpers';
import type { SongOption } from '@/lib/services/lesson-form-data';

type Props = {
  song: SongOption;
  index: number;
  optionId: string;
  isSelected: boolean;
  isActive: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

const truncate: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const boxStyle = (isSelected: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 16,
  height: 16,
  borderRadius: 4,
  border: `1px solid ${isSelected ? 'var(--ink)' : 'var(--ink-5)'}`,
  background: isSelected ? 'var(--ink)' : 'transparent',
  color: 'var(--ivory)',
});

/** One song row inside the picker's listbox. Borders and backgrounds live in
 * CSS (`.ui-song-option`) so hover / active / selected states can layer — an
 * inline background would win over every one of them. */
export const SongPickerOption = ({
  song,
  index,
  optionId,
  isSelected,
  isActive,
  disabled,
  onToggle,
}: Props) => {
  const t = useTranslations('Songs');
  return (
    <button
      type="button"
      role="option"
      id={optionId}
      data-index={index}
      aria-selected={isSelected}
      tabIndex={-1}
      disabled={disabled}
      className={`ui-song-option${isActive ? ' is-active' : ''}`}
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 12px',
        textAlign: 'left',
        font: 'inherit',
        color: 'var(--ink)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span style={boxStyle(isSelected)} aria-hidden="true">
        {isSelected && <Check size={11} strokeWidth={3} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{ ...truncate, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14 }}
        >
          {song.title || t('untitledFallback')}
        </span>
        {song.author && (
          <span style={{ ...truncate, fontSize: 12, color: 'var(--ink-3)' }}>{song.author}</span>
        )}
      </span>
      {song.level && (
        <span
          className="ui-song-level"
          style={{
            flexShrink: 0,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            color: 'var(--ink-4)',
          }}
        >
          {levelLabel(song.level, t)}
        </span>
      )}
    </button>
  );
};
