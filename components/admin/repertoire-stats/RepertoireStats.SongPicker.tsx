'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';

import { statsHref, type StatsParams } from './repertoire-stats.helpers';

type Option = { id: string; title: string; author: string | null };
type Props = { params: StatsParams; options: Option[]; selected: Option | null };

const SHOWN = 8;
const fold = (text: string | null) =>
  (text ?? '').toLocaleLowerCase('pl').normalize('NFD').replace(/\p{M}/gu, '');

/** Finds a song by title or artist and opens the view for it. */
export function RepertoireStatsSongPicker({ params, options, selected }: Props) {
  const t = useTranslations('RepertoireStats.picker');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const matches = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return [];
    return options
      .filter(
        (option) => fold(option.title).includes(needle) || fold(option.author).includes(needle)
      )
      .slice(0, SHOWN);
  }, [options, query]);
  const choose = (song: string | null) => {
    setIsOpen(false);
    setQuery('');
    router.push(statsHref(params, { song }), { scroll: false });
  };
  return (
    <div className="relative w-full md:w-[380px]">
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--rule)] bg-[var(--card)] px-3 md:min-h-0 md:py-1.5">
        <Search aria-hidden className="size-3.5 shrink-0 text-[var(--ink-4)]" />
        <input
          role="combobox"
          aria-expanded={isOpen && matches.length > 0}
          aria-controls="repertoire-song-options"
          aria-label={t('label')}
          value={query}
          placeholder={
            selected
              ? `${selected.title}${selected.author ? ` · ${selected.author}` : ''}`
              : t('placeholder')
          }
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && matches[0]) choose(matches[0].id);
            if (event.key === 'Escape') setIsOpen(false);
          }}
          className={`w-full bg-transparent text-[13px] outline-none ${selected ? 'placeholder:font-medium placeholder:text-[var(--ink)]' : 'placeholder:text-[var(--ink-4)]'}`}
        />
        {selected && (
          <button
            type="button"
            onClick={() => choose(null)}
            aria-label={t('clear')}
            className="text-[var(--ink-4)]"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
      {isOpen && matches.length > 0 && (
        <ul
          id="repertoire-song-options"
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[var(--rule)] bg-[var(--card)] shadow-sm"
        >
          {matches.map((option) => (
            <li key={option.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => choose(option.id)}
                className="flex min-h-11 w-full items-baseline gap-2 px-3 py-2 text-left hover:bg-[var(--rule-2)]"
              >
                <span className="font-medium">{option.title}</span>
                <span className="truncate text-[12px] text-[var(--ink-3)]">{option.author}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
