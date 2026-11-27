'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { MarkIcon } from './RepertoireStatsPrimitives';
import { statsHref, type StatsParams } from './repertoire-stats.helpers';

type Props = {
  params: StatsParams;
  categories: { value: string; count: number }[];
  levels: string[];
};

const MARKS = ['ok', 'error', 'review', 'explained'] as const;
/** Category pills shown; the rest of the categories stay reachable through the search. */
const SHOWN_CATEGORIES = 4;

const pill = (isActive: boolean) =>
  `inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-[13px] ${
    isActive
      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
      : 'border-[var(--rule)] bg-[var(--card)] text-[var(--ink-3)] hover:border-[var(--ink-5)]'
  }`;

/** Search, category, level and "only with disagreements": each change is a new URL, so the server filters. */
export function RepertoireStatsSongsFilters({ params, categories, levels }: Props) {
  const t = useTranslations('RepertoireStats');
  const router = useRouter();
  const go = (changes: Partial<StatsParams>) =>
    router.push(statsHref(params, { ...changes, limit: 0 }), { scroll: false });
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: String(new FormData(event.currentTarget).get('q') ?? '') });
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--rule)] bg-[var(--card)] px-3 py-1.5 md:w-60"
      >
        <Search aria-hidden className="size-3.5 text-[var(--ink-4)]" />
        <input
          name="q"
          defaultValue={params.q}
          placeholder={t('songs.search')}
          aria-label={t('songs.search')}
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--ink-4)]"
        />
      </form>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {[null, ...categories.slice(0, SHOWN_CATEGORIES).map((category) => category.value)].map(
          (category) => (
            <Link
              key={category ?? 'all'}
              href={statsHref(params, { category, limit: 0 })}
              className={pill(params.category === category)}
            >
              {category ?? t('songs.allCategories')}
            </Link>
          )
        )}
      </div>
      <select
        value={params.level ?? ''}
        onChange={(event) => go({ level: event.target.value || null })}
        aria-label={t('songs.level')}
        className="min-h-9 rounded-lg border border-[var(--rule)] bg-[var(--card)] px-2.5 text-[13px] text-[var(--ink-2)]"
      >
        <option value="">{t('songs.allLevels')}</option>
        {levels.map((level) => (
          <option key={level} value={level}>
            {t.has(`level.${level}`) ? t(`level.${level}`) : level}
          </option>
        ))}
      </select>
      <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-[var(--rule)] bg-[var(--card)] px-3 text-[13px] text-[var(--ink-2)]">
        <input
          type="checkbox"
          checked={params.hasMismatches}
          onChange={(event) => go({ hasMismatches: event.target.checked })}
          className="accent-[var(--ink)]"
        />
        {t('songs.onlyMismatches')}
      </label>
      <div className="hidden flex-1 justify-end gap-4 text-[12px] text-[var(--ink-3)] xl:flex">
        {MARKS.map((mark) => (
          <span key={mark} className="inline-flex items-center gap-1.5">
            <MarkIcon mark={mark} label={t(`mark.${mark}`)} />
            {t(`mark.${mark}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
