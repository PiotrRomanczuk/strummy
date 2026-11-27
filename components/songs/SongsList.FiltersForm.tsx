'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';

import { MAIN_TECHNIQUES, isMainTechnique } from '@/lib/music-theory/song-techniques';
import type { SongsListFilters } from '@/lib/services/songs-list-queries';

import { buildHref, KEYS } from './songs-list.helpers';

type Props = {
  filters: SongsListFilters;
};

const fieldLabel =
  'font-[family-name:var(--mono)] text-[11px] tracking-[.12em] text-[var(--ink-4)] uppercase';

// On phones the controls sit inside a card, so they take the paper tone; from
// `md` up the card is gone and they are bare toolbar controls on the page.
const control =
  'h-9 rounded-lg border border-[var(--rule)] bg-[var(--paper)] px-2.5 font-[family-name:var(--sans)] text-[12.5px] text-[var(--ink)] md:bg-[var(--card)]';

/** Key / author filters that apply as you interact — the select pushes
 * immediately, the text input debounces. No Apply button needed. Title search
 * lives above the filters (`SongsList.SearchField`). */
export const SongsListFiltersForm = ({ filters }: Props) => {
  const t = useTranslations('Songs');
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = (next: Partial<SongsListFilters>) =>
    router.push(buildHref(next, filters), { scroll: false });

  const applyDebounced = (next: Partial<SongsListFilters>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      router.replace(buildHref(next, filters), { scroll: false });
    }, 350);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        const data = new FormData(e.currentTarget);
        apply({
          key: String(data.get('key') ?? '') || undefined,
          author: String(data.get('author') ?? '').trim() || undefined,
        });
      }}
      className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[var(--rule)] bg-[var(--card)] px-3.5 py-2.5 max-md:order-3 md:flex-nowrap md:rounded-none md:border-0 md:bg-transparent md:p-0"
    >
      <span className={fieldLabel}>{t('filterKeyLabel')}</span>
      <select
        name="key"
        aria-label={t('filterByKeyAria')}
        defaultValue={filters.key ?? ''}
        onChange={(e) => apply({ key: e.target.value || undefined })}
        className={control}
      >
        <option value="">{t('filterAnyOption')}</option>
        {KEYS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <span className={fieldLabel}>{t('filterTechniqueLabel')}</span>
      <select
        name="technique"
        aria-label={t('filterByTechniqueAria')}
        defaultValue={filters.technique ?? ''}
        onChange={(e) =>
          apply({ technique: isMainTechnique(e.target.value) ? e.target.value : undefined })
        }
        className={control}
      >
        <option value="">{t('filterAnyTechniqueOption')}</option>
        {MAIN_TECHNIQUES.map((key) => (
          <option key={key} value={key}>
            {t(`techniqueName.${key}`)}
          </option>
        ))}
      </select>
      <input
        type="text"
        name="author"
        defaultValue={filters.author ?? ''}
        placeholder={t('authorPlaceholder')}
        aria-label={t('filterByAuthorAria')}
        onChange={(e) => applyDebounced({ author: e.target.value.trim() || undefined })}
        className={`${control} min-w-[140px] flex-1 md:w-[200px] md:flex-none`}
      />
    </form>
  );
};
