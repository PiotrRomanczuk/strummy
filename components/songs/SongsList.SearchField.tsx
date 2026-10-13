'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import type { SongsListFilters } from '@/lib/services/songs-list-queries';

import { buildHref } from './songs-list.helpers';

/**
 * Title search, full width above the filters — the one control a teacher with
 * a 2,000-song library reaches for first. Debounced like the other text
 * filters; Enter applies immediately.
 */
export const SongsListSearchField = ({ filters }: { filters: SongsListFilters }) => {
  const t = useTranslations('Songs');
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = (search: string, isImmediate: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    const go = () =>
      router.replace(buildHref({ search: search.trim() || undefined }, filters), {
        scroll: false,
      });
    if (isImmediate) go();
    else timer.current = setTimeout(go, 350);
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply(String(new FormData(e.currentTarget).get('search') ?? ''), true);
      }}
      className="relative"
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--ink-4)]"
        aria-hidden="true"
      />
      <input
        type="search"
        name="search"
        defaultValue={filters.search ?? ''}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchByTitleAria')}
        onChange={(e) => apply(e.target.value, false)}
        className="h-11 w-full rounded-[10px] border border-[var(--rule)] bg-[var(--card)] pr-3 pl-9 text-sm text-[var(--ink)]"
      />
    </form>
  );
};
