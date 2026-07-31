import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { SongsListFilters, SongsListResult } from '@/lib/services/songs-list-queries';

import { levelLabel } from './song-format.helpers';
import { FilterChipRow, FilterRow } from '@/components/shared/ListFilters';

import { SongsListFiltersForm } from './SongsList.FiltersForm';
import { SongRequestButton } from './requests/SongRequestButton';
import { buildHref, LEVELS, SORTS, SORT_LABEL_KEYS } from './songs-list.helpers';

type Props = {
  total: number;
  canCreate: boolean;
  breakdown: SongsListResult['breakdown'];
  filters: SongsListFilters;
  canRequest: boolean;
};

export const SongsListFiltersBar = async ({
  total,
  canCreate,
  breakdown,
  filters,
  canRequest,
}: Props) => {
  const t = await getTranslations('Songs');
  return (
    <div style={{ padding: '0 0 18px' }}>
      <div className="ui-page-head" style={{ marginBottom: 18 }}>
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
        {canCreate && (
          <Link
            href="/dashboard/songs/new"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: 'var(--sans)',
            }}
          >
            {t('newSongLink')}
          </Link>
        )}
        {canCreate && (
          <Link
            href="/dashboard/songs/requests"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: 'var(--ink-5)',
              color: 'var(--ink)',
              border: '1px solid var(--rule)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: 'var(--sans)',
            }}
          >
            {t('pendingRequests', { fallback: 'Pending Requests' })}
          </Link>
        )}
        {canRequest && <SongRequestButton />}
      </div>

      <FilterRow>
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
        <FilterChipRow
          align="end"
          chips={SORTS.map((srt) => ({
            key: srt,
            href: buildHref({ sort: srt }, filters),
            label: t(SORT_LABEL_KEYS[srt]),
            isActive: filters.sort === srt,
          }))}
        />
      </FilterRow>

      {/* Key / author / search apply live (client component). */}
      <SongsListFiltersForm filters={filters} />
    </div>
  );
};
