import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { CategoryBreakdown, SongsListFilters } from '@/lib/services/songs-list-queries';

import { buildHref } from './songs-list.helpers';

type Props = {
  categories: CategoryBreakdown;
  total: number;
  filters: SongsListFilters;
};

/**
 * Genre/category tab strip. Categories are free text, so unlike the level
 * chips this list is derived from whatever is actually in the catalog rather
 * than a fixed enum — "All" always leads, the rest sort by count.
 */
export const SongsListCategoryTabs = async ({ categories, total, filters }: Props) => {
  if (categories.length === 0) return null;
  const t = await getTranslations('Songs');

  return (
    // Sits directly on the table (Claude Design "Song List"): no gap below, and
    // the strip scrolls without a scrollbar — categories are free text, so a
    // real catalogue has far more of them than fit one line.
    <div
      className="ui-tabs mb-0! [scrollbar-width:none]"
      role="tablist"
      aria-label={t('filterCategoryLabel')}
    >
      <Link
        href={buildHref({ category: undefined }, filters)}
        className={`ui-tab${!filters.category ? ' is-active' : ''}`}
        role="tab"
        aria-selected={!filters.category}
      >
        {t('filterAnyOption')}
        <span className="ui-tab-count">{total}</span>
      </Link>
      {categories.map(({ category, count }) => {
        const isActive = filters.category === category;
        return (
          <Link
            key={category}
            href={buildHref({ category: isActive ? undefined : category }, filters)}
            className={`ui-tab${isActive ? ' is-active' : ''}`}
            role="tab"
            aria-selected={isActive}
          >
            {category}
            <span className="ui-tab-count">{count}</span>
          </Link>
        );
      })}
    </div>
  );
};
