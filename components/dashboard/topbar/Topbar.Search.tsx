'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SEARCH_LIST_ID, TopbarSearchList, searchOptionId } from './Topbar.Search.List';
import { buildSearchItems } from './topbar-search.helpers';
import { useTopbarSearch } from './useTopbarSearch';

interface TopbarSearchProps {
  /** Teachers/admins can also search the people list. */
  canSearchStudents: boolean;
}

/**
 * Claude Design top-bar search pill. Results open directly; the rows at the
 * bottom jump to the list page with its `search` filter applied.
 */
export function TopbarSearch({ canSearchStudents }: TopbarSearchProps) {
  const t = useTranslations('Topbar');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = query.trim();
  const { results, isSearching } = useTopbarSearch(q);
  const items = buildSearchItems(results, q, canSearchStudents, t);
  const isListOpen = isOpen && q.length > 0;
  const isEmpty = !isSearching && q.length >= 2 && items.songs.length + items.students.length === 0;

  const go = (href: string) => {
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
    router.push(href);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && q) go((items.all[activeIndex] ?? items.all[0]).href);
    if (event.key === 'Escape') inputRef.current?.blur();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + step + items.all.length) % items.all.length);
    }
  };

  return (
    <div className="relative max-w-[420px] min-w-0 flex-1" data-testid="topbar-search">
      <label className="flex items-center gap-2 rounded-full bg-[var(--rule-2)] px-3 py-[7px] text-[13px] text-[var(--ink-4)]">
        <SearchIcon className="size-3.5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={isListOpen}
          aria-controls={SEARCH_LIST_ID}
          aria-activedescendant={isListOpen ? searchOptionId(activeIndex) : undefined}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          // w-0: without it the input's intrinsic width sets the bar's minimum.
          className="w-0 min-w-0 flex-1 bg-transparent text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]"
        />
        <kbd className="rounded border border-[var(--rule)] px-1.5 py-px font-[family-name:var(--mono)] text-[11px] text-[var(--ink-4)]">
          ⌘K
        </kbd>
      </label>
      {isListOpen && (
        <TopbarSearchList
          {...items}
          activeIndex={activeIndex}
          isEmpty={isEmpty}
          onActivate={setActiveIndex}
          onSelect={go}
        />
      )}
    </div>
  );
}
