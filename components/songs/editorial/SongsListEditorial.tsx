import Link from 'next/link';

import type { Song } from '@/components/songs/types';
import type {
  SongListLevel,
  SongsListFilters,
  SongsListResult,
} from '@/lib/services/songs-list-queries';

import { levelLabel } from './format';
import { Card } from './primitives';

type Props = {
  songs: Song[];
  total: number;
  breakdown: SongsListResult['breakdown'];
  canCreate: boolean;
  filters: SongsListFilters;
};

const LEVELS: SongListLevel[] = ['beginner', 'intermediate', 'advanced'];

const SORT_LABEL: Record<SongsListFilters['sort'], string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Alphabetical',
};

const SORTS: SongsListFilters['sort'][] = ['newest', 'oldest', 'title'];

const buildHref = (next: Partial<SongsListFilters>, current: SongsListFilters): string => {
  const merged = { ...current, ...next };
  const params = new URLSearchParams();
  if (merged.level) params.set('level', merged.level);
  if (merged.search) params.set('search', merged.search);
  if (merged.sort !== 'newest') params.set('sort', merged.sort);
  const qs = params.toString();
  return qs ? `/dashboard/songs?${qs}` : '/dashboard/songs';
};

const Header = ({
  total,
  canCreate,
  breakdown,
  filters,
}: {
  total: number;
  canCreate: boolean;
  breakdown: SongsListResult['breakdown'];
  filters: SongsListFilters;
}) => (
  <div style={{ padding: '0 0 18px' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 18,
      }}
    >
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
          Repertoire
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
          Songs
        </h1>
        <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 6 }}>
          {total} {total === 1 ? 'song' : 'songs'}
          {filters.search ? ` matching “${filters.search}”` : ''}
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
          + New song
        </Link>
      )}
    </div>
    <form
      action="/dashboard/songs"
      method="GET"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '10px 14px',
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 10,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          fontFamily: 'var(--mono)',
        }}
      >
        Level
      </span>
      {LEVELS.map((lvl) => {
        const active = filters.level === lvl;
        return (
          <Link
            key={lvl}
            href={buildHref({ level: active ? undefined : lvl }, filters)}
            style={{
              padding: '4px 10px',
              borderRadius: 99,
              border: `1px solid ${active ? 'var(--ink)' : 'var(--rule)'}`,
              background: active ? 'var(--ink)' : 'transparent',
              fontSize: 12,
              color: active ? 'var(--paper)' : 'var(--ink-3)',
              textDecoration: 'none',
              fontFamily: 'var(--sans)',
            }}
          >
            {levelLabel(lvl)}
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
      {filters.sort !== 'newest' && <input type="hidden" name="sort" value={filters.sort} />}
      {filters.level && <input type="hidden" name="level" value={filters.level} />}
      <input
        type="search"
        name="search"
        defaultValue={filters.search ?? ''}
        placeholder="Search by title…"
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid var(--rule)',
          fontSize: 12,
          background: 'var(--paper)',
          fontFamily: 'var(--sans)',
          minWidth: 200,
        }}
      />
      {SORTS.map((s) => {
        const active = filters.sort === s;
        return (
          <Link
            key={s}
            href={buildHref({ sort: s }, filters)}
            style={{
              padding: '4px 10px',
              borderRadius: 99,
              border: `1px solid ${active ? 'var(--ink)' : 'var(--rule)'}`,
              background: active ? 'var(--ink)' : 'transparent',
              fontSize: 12,
              color: active ? 'var(--paper)' : 'var(--ink-3)',
              textDecoration: 'none',
              fontFamily: 'var(--sans)',
            }}
          >
            {SORT_LABEL[s]}
          </Link>
        );
      })}
    </form>
  </div>
);

export const SongsListEditorial = ({ songs, total, breakdown, canCreate, filters }: Props) => {
  const columns = '1fr 200px 100px 90px';
  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '28px 32px 64px',
      }}
    >
      <Header total={total} canCreate={canCreate} breakdown={breakdown} filters={filters} />
      <Card>
        {songs.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--ink-4)',
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
              fontSize: 15,
            }}
          >
            {filters.search || filters.level
              ? 'No songs match the current filters.'
              : 'No songs in the library yet. Add one to get started.'}
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: columns,
                gap: 14,
                padding: '12px 20px',
                borderBottom: '1px solid var(--rule)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '.12em',
                color: 'var(--ink-4)',
              }}
            >
              <span>Title</span>
              <span>Author</span>
              <span>Level</span>
              <span style={{ textAlign: 'right' }}>Key</span>
            </div>
            {songs.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/songs/${s.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: columns,
                  gap: 14,
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--rule)',
                  textDecoration: 'none',
                  color: 'inherit',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontStyle: 'italic',
                    fontSize: 15,
                    color: 'var(--ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.title || 'Untitled'}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--ink-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.author || '—'}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                    color: 'var(--ink-3)',
                  }}
                >
                  {s.level ? levelLabel(s.level) : '—'}
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    color: 'var(--ink-3)',
                  }}
                >
                  {s.key || '—'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
