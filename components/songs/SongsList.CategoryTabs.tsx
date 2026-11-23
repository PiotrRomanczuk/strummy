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
    <div className="ui-tabs" role="tablist" aria-label={t('filterCategoryLabel')}>
      <Link
        href={buildHref({ category: undefined }, filters)}
        className={`ui-tab${!filters.category ? ' is-active' : ''}`}
        role="tab"
        aria-selected={!filters.category}
      >
        {t('filterAnyOption')}
        <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 10 }}>{total}</span>
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
            <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 10 }}>{count}</span>
          </Link>
        );
      })}
    </div>
  );
};
