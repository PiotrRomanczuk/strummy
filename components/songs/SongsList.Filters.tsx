import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { SongsListFilters, SongsListResult } from '@/lib/services/songs-list-queries';

import { levelLabel } from './song-format.helpers';
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

const chipStyle = (active: boolean) => ({
  padding: '4px 10px',
  borderRadius: 99,
  border: `1px solid ${active ? 'var(--ink)' : 'var(--rule)'}`,
  background: active ? 'var(--ink)' : 'transparent',
  fontSize: 12,
  color: active ? 'var(--paper)' : 'var(--ink-3)',
  textDecoration: 'none',
  fontFamily: 'var(--sans)',
});

const fieldLabel = {
  fontSize: 11,
  color: 'var(--ink-4)',
  textTransform: 'uppercase' as const,
  letterSpacing: '.12em',
  fontFamily: 'var(--mono)',
};

export const SongsListFiltersBar = async ({ total, canCreate, breakdown, filters, canRequest }: Props) => {
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

      {/* Level + sort: navigation chips that preserve other filters via buildHref */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        <span style={fieldLabel}>{t('filterLevelLabel')}</span>
        {LEVELS.map((lvl) => {
          const active = filters.level === lvl;
          return (
            <Link
              key={lvl}
              href={buildHref({ level: active ? undefined : lvl }, filters)}
              role="button"
              aria-pressed={active}
              className={active ? undefined : 'ui-chip'}
              style={chipStyle(active)}
            >
              {levelLabel(lvl, t)}
              <span
                style={{
                  marginLeft: 6,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: active ? 'rgba(255,255,255,.6)' : 'var(--ink-4)',
                }}
              >
                {breakdown[lvl]}
              </span>
            </Link>
          );
        })}
        <span style={{ flex: 1, minWidth: 12 }} />
        {SORTS.map((s) => (
          <Link
            key={s}
            href={buildHref({ sort: s }, filters)}
            role="button"
            aria-pressed={filters.sort === s}
            className={filters.sort === s ? undefined : 'ui-chip'}
            style={chipStyle(filters.sort === s)}
          >
            {t(SORT_LABEL_KEYS[s])}
          </Link>
        ))}
      </div>

      {/* Key / author / search apply live (client component). */}
      <SongsListFiltersForm filters={filters} />
    </div>
  );
};
