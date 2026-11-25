'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SongOption } from '@/lib/services/lesson-form-data';

import { SongPickerList } from './SongPicker.List';
import { SongPickerSearch } from './SongPicker.Search';
import { useSongPicker } from './useSongPicker';

type Props = {
  songs: SongOption[];
  /** Selected song id, or '' for none. */
  value: string;
  onChange: (id: string) => void;
  /** What the trigger button shows (selected song, placeholder, "+ Add song"…). */
  children: ReactNode;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Label of the "no song" row; omit when a song is mandatory. */
  clearLabel?: string;
};

type PanelProps = Pick<Props, 'songs' | 'value' | 'onChange' | 'clearLabel'> & {
  onDone: () => void;
};

/** Search box + listbox inside the popover. Mounted only while open, so the
 * query starts empty every time. */
const SongSelectPanel = ({ songs, value, onChange, clearLabel, onDone }: PanelProps) => {
  const t = useTranslations('Songs');
  const reactId = useId();
  const listId = `${reactId}-list`;
  const picker = useSongPicker({
    songs,
    selectedIds: value ? [value] : [],
    // The picker toggles: picking another song yields [value, next], picking
    // the current one yields [] — both collapse to a single choice.
    onChange: (ids) => {
      const next = ids.find((id) => id !== value) ?? '';
      // Re-picking the current song only clears it where "no song" is allowed.
      if (next || clearLabel) onChange(next);
      onDone();
    },
  });
  const active = picker.filtered[picker.activeIndex];

  return (
    <div className="flex flex-col gap-2">
      <SongPickerSearch
        value={picker.query}
        listId={listId}
        hintId={`${reactId}-hint`}
        activeOptionId={active ? `${reactId}-opt-${picker.activeIndex}` : undefined}
        placeholder={t('pickerSearchPlaceholder', { count: songs.length })}
        onChange={picker.updateQuery}
        onKeyDown={picker.handleKeyDown}
      />
      <SongPickerList
        listRef={picker.listRef}
        listId={listId}
        optionIdPrefix={`${reactId}-opt-`}
        songs={picker.filtered}
        isLibraryEmpty={songs.length === 0}
        emptyLibraryHint={t('pickerDefaultEmptyHint')}
        query={picker.query}
        selectedIds={picker.selectedSet}
        activeIndex={picker.activeIndex}
        isMultiple={false}
        onToggle={(index, id) => {
          picker.setActiveIndex(index);
          picker.toggle(id);
        }}
      />
      {clearLabel && value && (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline"
          onClick={() => {
            onChange('');
            onDone();
          }}
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
};

/**
 * Searchable single-song select: the trigger button is whatever the caller
 * renders, the popover holds the same search + list the multi-select picker
 * uses. Replaces native `<select>`s with several hundred options and no search.
 */
export const SongSelect = ({
  songs,
  value,
  onChange,
  children,
  id,
  ariaLabel,
  disabled,
  className,
  style,
  clearLabel,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          disabled={disabled}
          className={className}
          style={style}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] p-2">
        <SongSelectPanel
          songs={songs}
          value={value}
          onChange={onChange}
          clearLabel={clearLabel}
          onDone={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};
