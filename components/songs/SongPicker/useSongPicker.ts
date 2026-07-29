'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

import type { SongOption } from '@/lib/services/lesson-form-data';

import { filterSongs, resolveSelected } from './song-picker.helpers';

type Args = {
  songs: SongOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

/** Query, keyboard cursor and selection plumbing for <SongPicker />. */
export const useSongPicker = ({ songs, selectedIds, onChange, disabled }: Args) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterSongs(songs, query), [songs, query]);
  const selectedSongs = useMemo(() => resolveSelected(songs, selectedIds), [songs, selectedIds]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(selectedSet.has(id) ? selectedIds.filter((sid) => sid !== id) : [...selectedIds, id]);
  };

  /** A new query renders a different list, so the cursor and the scroll offset
   * both go back to the top. */
  const updateQuery = (next: string) => {
    setQuery(next);
    setActiveIndex(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const moveActive = (delta: number) => {
    if (filtered.length === 0) return;
    const next = Math.min(filtered.length - 1, Math.max(0, activeIndex + delta));
    setActiveIndex(next);
    // scrollIntoView is not implemented in jsdom, hence the optional call.
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${next}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Enter') {
      // Always swallow ⏎ — otherwise it submits the surrounding form while the
      // teacher is still picking songs.
      event.preventDefault();
      const song = filtered[activeIndex];
      if (song) toggle(song.id);
    } else if (event.key === 'Escape' && query) {
      event.preventDefault();
      updateQuery('');
    }
  };

  return {
    query,
    activeIndex,
    listRef,
    filtered,
    selectedSongs,
    selectedSet,
    setActiveIndex,
    toggle,
    updateQuery,
    handleKeyDown,
  };
};
