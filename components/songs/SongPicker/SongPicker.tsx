'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/_ui/form-styles';
import type { SongOption } from '@/lib/services/lesson-form-data';

import { SongPickerChips } from './SongPicker.Chips';
import { SongPickerList } from './SongPicker.List';
import { SongPickerSearch } from './SongPicker.Search';
import { useSongPicker } from './useSongPicker';

type Props = {
  songs: SongOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Id the surrounding <label> points at — the search box owns the label. */
  inputId?: string;
  disabled?: boolean;
  emptyLibraryHint?: string;
};

/**
 * Searchable multi-select over the song library: type to filter, click or hit
 * ⏎ to toggle, chips above show what is already picked. Replaces the native
 * `<select multiple>`, which hid the selection behind a scrollbar and needed
 * ⌘-click to add a second song.
 */
export const SongPicker = ({
  songs,
  selectedIds,
  onChange,
  inputId,
  disabled,
  emptyLibraryHint,
}: Props) => {
  const t = useTranslations('Songs');
  const reactId = useId();
  const listId = `${reactId}-list`;
  const hintId = `${reactId}-hint`;
  const optionIdPrefix = `${reactId}-opt-`;

  const picker = useSongPicker({ songs, selectedIds, onChange, disabled });
  const { query, filtered, activeIndex } = picker;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {picker.selectedSongs.length > 0 && (
        <SongPickerChips
          songs={picker.selectedSongs}
          disabled={disabled}
          onRemove={picker.toggle}
          onClear={() => onChange([])}
        />
      )}

      <SongPickerSearch
        value={query}
        inputId={inputId}
        listId={listId}
        hintId={hintId}
        disabled={disabled || songs.length === 0}
        activeOptionId={filtered[activeIndex] ? `${optionIdPrefix}${activeIndex}` : undefined}
        placeholder={
          songs.length === 0
            ? t('pickerNoSongsToPickFrom')
            : t('pickerSearchPlaceholder', { count: songs.length })
        }
        onChange={picker.updateQuery}
        onKeyDown={picker.handleKeyDown}
      />

      <SongPickerList
        listRef={picker.listRef}
        listId={listId}
        optionIdPrefix={optionIdPrefix}
        songs={filtered}
        isLibraryEmpty={songs.length === 0}
        emptyLibraryHint={emptyLibraryHint ?? t('pickerDefaultEmptyHint')}
        query={query}
        selectedIds={picker.selectedSet}
        activeIndex={activeIndex}
        disabled={disabled}
        onToggle={(index, id) => {
          picker.setActiveIndex(index);
          picker.toggle(id);
        }}
      />

      <div
        id={hintId}
        style={{ ...s.hint, display: 'flex', justifyContent: 'space-between', gap: 12 }}
      >
        <span>
          {t('pickerSelectedCount', { count: selectedIds.length })}
          {query ? t('pickerShownOfTotal', { shown: filtered.length, total: songs.length }) : ''}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontStyle: 'normal' }}>
          {t('pickerKeyboardHint')}
        </span>
      </div>
    </div>
  );
};
