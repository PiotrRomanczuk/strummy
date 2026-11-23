import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { SongsListFilters, SongsListResult } from '@/lib/services/songs-list-queries';

import { levelLabel } from './song-format.helpers';
import { FilterChipRow } from '@/components/shared/ListFilters';

import { SongsListFiltersDisclosure } from './SongsList.FiltersDisclosure';
import { SongsListFiltersForm } from './SongsList.FiltersForm';
import { SongsListSearchField } from './SongsList.SearchField';
import { SongRequestButton } from './requests/SongRequestButton';
import { buildHref, LEVELS, SORTS, SORT_LABEL_KEYS } from './songs-list.helpers';

type Props = {
  total: number;
  canCreate: boolean;
  breakdown: SongsListResult['breakdown'];
  filters: SongsListFilters;
  canRequest: boolean;
};

// Claude Design "Song List" header buttons: one ink primary, quiet ghosts.
const primaryButton =
  'inline-flex items-center rounded-lg bg-[var(--ink)] px-3.5 py-2.5 font-[family-name:var(--sans)] text-[13px] font-medium text-[var(--paper)] no-underline md:py-2';
const ghostButton =
  'inline-flex items-center rounded-lg border border-[var(--rule)] bg-[var(--card)] px-3 py-2.5 font-[family-name:var(--sans)] text-[12.5px] text-[var(--ink-3)] no-underline md:py-[7px]';

export const SongsListFiltersBar = async ({
  total,
  canCreate,
  breakdown,
  filters,
  canRequest,
}: Props) => {
  const t = await getTranslations('Songs');
  const activeCount = [filters.level, filters.key, filters.author].filter(Boolean).length;
  return (
    <div>
      <div className="ui-page-head mb-4">
        <div>
          <div
            style={{
              color: 'var(--ink-4)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '.16em',
              fontFamily: 'var(--mono)',
            }}
          >
            {t('repertoireEyebrow')}
          </div>
          <h1
            style={{
              margin: '4px 0 0',
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 40,
              letterSpacing: '-0.02em',
              fontStyle: 'italic',
            }}
          >
            {t('songsPageTitle')}
          </h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 6 }}>
            {total} {total === 1 ? t('songCountSingular') : t('songCountPlural')}
            {filters.search ? t('matchingSearch', { search: filters.search }) : ''}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <Link href="/dashboard/songs/new" className={primaryButton}>
              {t('newSongLink')}
            </Link>
          )}
          {canCreate && (
            <Link href="/dashboard/songs/requests" className={ghostButton}>
              {t('pendingRequests')}
            </Link>
          )}
          {canCreate && (
            <Link href="/dashboard/songs/links" className={ghostButton}>
              {t('missingLinks')}
            </Link>
          )}
          {canRequest && <SongRequestButton />}
        </div>
      </div>

      {/* One toolbar row from `md` up — search, key, author, sort — with the
          level chips on the line below. On phones everything but the search
          folds into the disclosure, in the original order (level, sort, form). */}
      <div className="md:mb-4 md:flex md:flex-wrap md:items-center md:gap-x-2.5 md:gap-y-3">
        <SongsListSearchField filters={filters} />

        <SongsListFiltersDisclosure
          label={
            activeCount > 0 ? t('filtersToggleActive', { count: activeCount }) : t('filtersToggle')
          }
          activeCount={activeCount}
        >
          {/* Key / author apply live (client component). */}
          <SongsListFiltersForm filters={filters} />
          <div className="max-md:order-2 md:ml-auto">
            <FilterChipRow
              chips={SORTS.map((srt) => ({
                key: srt,
                href: buildHref({ sort: srt }, filters),
                label: t(SORT_LABEL_KEYS[srt]),
                isActive: filters.sort === srt,
              }))}
            />
          </div>
          <div className="max-md:order-1 md:basis-full">
            <FilterChipRow
              label={t('filterLevelLabel')}
              chips={LEVELS.map((lvl) => ({
                key: lvl,
                href: buildHref({ level: filters.level === lvl ? undefined : lvl }, filters),
                label: levelLabel(lvl, t),
                isActive: filters.level === lvl,
                count: breakdown[lvl],
              }))}
            />
          </div>
        </SongsListFiltersDisclosure>
      </div>
    </div>
  );
};
