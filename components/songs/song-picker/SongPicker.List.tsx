'use client';

import type { CSSProperties, RefObject } from 'react';
import { useTranslations } from 'next-intl';

import type { SongOption } from '@/lib/services/lesson-form-data';

import { SongPickerOption } from './SongPicker.Option';

type Props = {
  listRef: RefObject<HTMLDivElement | null>;
  listId: string;
  optionIdPrefix: string;
  /** Songs left after the query — may be a subset of the library. */
  songs: SongOption[];
  isLibraryEmpty: boolean;
  emptyLibraryHint: string;
  query: string;
  selectedIds: Set<string>;
  activeIndex: number;
  disabled?: boolean;
  onToggle: (index: number, id: string) => void;
};

const MAX_HEIGHT = 264;

const emptyStyle: CSSProperties = {
  padding: '22px 14px',
  textAlign: 'center',
  fontFamily: 'var(--serif)',
  fontStyle: 'italic',
  fontSize: 13,
  color: 'var(--ink-4)',
};

/** Scrollable listbox of togglable song rows. */
export const SongPickerList = ({
  listRef,
  listId,
  optionIdPrefix,
  songs,
  isLibraryEmpty,
  emptyLibraryHint,
  query,
  selectedIds,
  activeIndex,
  disabled,
  onToggle,
}: Props) => {
  const t = useTranslations('Songs');
  return (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-multiselectable="true"
      aria-label={t('pickerListAriaLabel')}
      style={{
        maxHeight: MAX_HEIGHT,
        overflowY: 'auto',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        background: 'var(--card)',
      }}
    >
      {isLibraryEmpty && <div style={emptyStyle}>{emptyLibraryHint}</div>}
      {!isLibraryEmpty && songs.length === 0 && (
        <div style={emptyStyle}>{t('pickerNoMatch', { query })}</div>
      )}
      {songs.map((song, index) => (
        <SongPickerOption
          key={song.id}
          song={song}
          index={index}
          optionId={`${optionIdPrefix}${index}`}
          isSelected={selectedIds.has(song.id)}
          isActive={index === activeIndex}
          disabled={disabled}
          onToggle={() => onToggle(index, song.id)}
        />
      ))}
    </div>
  );
};
