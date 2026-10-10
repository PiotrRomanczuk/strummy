'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TopbarSearchProps {
  /** Teachers/admins can also search the people list. */
  canSearchStudents: boolean;
}

/**
 * Claude Design top-bar search pill. Submitting jumps to the matching list
 * page with its `search` filter applied (songs, and students for teachers).
 */
export function TopbarSearch({ canSearchStudents }: TopbarSearchProps) {
  const t = useTranslations('Topbar');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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
  const targets = [
    {
      key: 'songs',
      label: t('searchSongs', { q }),
      href: `/dashboard/songs?search=${encodeURIComponent(q)}`,
    },
    ...(canSearchStudents
      ? [
          {
            key: 'students',
            label: t('searchStudents', { q }),
            href: `/dashboard/users?search=${encodeURIComponent(q)}`,
          },
        ]
      : []),
  ];

  const go = (href: string) => {
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
    router.push(href);
  };

  return (
    <div className="relative max-w-[420px] flex-1" data-testid="topbar-search">
      <label className="flex items-center gap-2 rounded-full bg-[var(--rule-2)] px-3 py-[7px] text-[13px] text-[var(--ink-4)]">
        <SearchIcon className="size-3.5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && q) go(targets[0].href);
            if (event.key === 'Escape') inputRef.current?.blur();
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]"
        />
        <kbd className="rounded border border-[var(--rule)] px-1.5 py-px font-[family-name:var(--mono)] text-[11px] text-[var(--ink-4)]">
          ⌘K
        </kbd>
      </label>
      {isOpen && q && (
        <ul className="absolute top-full right-0 left-0 z-40 mt-1.5 overflow-hidden rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--card)] py-1 shadow-[var(--shadow-md)]">
          {targets.map((target) => (
            <li key={target.key}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(target.href)}
                className="w-full px-3 py-2 text-left text-[13px] text-[var(--ink-2)] hover:bg-[var(--rule-2)]"
              >
                {target.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
