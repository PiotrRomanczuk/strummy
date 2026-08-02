/**
 * Unit tests: repertoire filtering + sorting.
 *
 * These run in the app rather than the database (the page loads the student's
 * whole repertoire in one RLS-scoped read and does not paginate), so they are
 * pure functions and worth testing directly.
 *
 * @see components/repertoire/repertoire-filters.helpers.ts
 */

import type { StudentRepertoireWithSong } from '@/types/StudentRepertoire';

import { filterEntries, stageCounts, type RepertoireFilters } from './repertoire-filters.helpers';

const entry = (
  over: Partial<{
    id: string;
    title: string;
    author: string | null;
    status: string;
    practisedAt: string | null;
  }> = {}
): StudentRepertoireWithSong =>
  ({
    id: over.id ?? 'r1',
    current_status: over.status ?? 'to_learn',
    last_practiced_at: over.practisedAt ?? null,
    song: { id: 's1', title: over.title ?? 'Wonderwall', author: over.author ?? 'Oasis' },
  }) as unknown as StudentRepertoireWithSong;

const base: RepertoireFilters = { sort: 'recent' };

describe('filterEntries — search', () => {
  const rows = [
    entry({ id: 'a', title: 'Wonderwall', author: 'Oasis' }),
    entry({ id: 'b', title: 'Blackbird', author: 'The Beatles' }),
    entry({ id: 'c', title: 'Yesterday', author: 'The Beatles' }),
  ];

  it('matches on title', () => {
    expect(filterEntries(rows, { ...base, search: 'wonder' }).map((r) => r.id)).toEqual(['a']);
  });

  // Searching an artist is the obvious thing to try, and matching title only
  // would silently return nothing for it.
  it('matches on author too', () => {
    expect(
      filterEntries(rows, { ...base, search: 'beatles' })
        .map((r) => r.id)
        .sort()
    ).toEqual(['b', 'c']);
  });

  it('is case-insensitive', () => {
    expect(filterEntries(rows, { ...base, search: 'WONDERWALL' }).map((r) => r.id)).toEqual(['a']);
  });

  it('returns everything when the search is empty', () => {
    expect(filterEntries(rows, base)).toHaveLength(3);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterEntries(rows, { ...base, search: 'zzz' })).toEqual([]);
  });
});

describe('filterEntries — stage', () => {
  const rows = [
    entry({ id: 'a', status: 'to_learn' }),
    entry({ id: 'b', status: 'mastered' }),
    entry({ id: 'c', status: 'mastered' }),
  ];

  it('keeps only the selected stage', () => {
    expect(
      filterEntries(rows, { ...base, stage: 'mastered' })
        .map((r) => r.id)
        .sort()
    ).toEqual(['b', 'c']);
  });

  it('combines with search', () => {
    const mixed = [
      entry({ id: 'a', title: 'Wonderwall', status: 'mastered' }),
      entry({ id: 'b', title: 'Blackbird', status: 'mastered' }),
    ];
    expect(
      filterEntries(mixed, { ...base, stage: 'mastered', search: 'wonder' }).map((r) => r.id)
    ).toEqual(['a']);
  });
});

describe('filterEntries — sorting', () => {
  it('recent puts the most recently practised first', () => {
    const rows = [
      entry({ id: 'old', practisedAt: '2026-07-01T00:00:00Z' }),
      entry({ id: 'new', practisedAt: '2026-07-20T00:00:00Z' }),
    ];
    expect(filterEntries(rows, { sort: 'recent' }).map((r) => r.id)).toEqual(['new', 'old']);
  });

  // A null date sorts as -Infinity deliberately: treating it as 0 would put
  // never-practised songs at the TOP of "recently practised", which is wrong.
  it('recent puts never-practised songs last, not first', () => {
    const rows = [
      entry({ id: 'never', practisedAt: null }),
      entry({ id: 'once', practisedAt: '2026-07-01T00:00:00Z' }),
    ];
    expect(filterEntries(rows, { sort: 'recent' }).map((r) => r.id)).toEqual(['once', 'never']);
  });

  it('title sorts alphabetically, ignoring case', () => {
    const rows = [
      entry({ id: 'b', title: 'banana' }),
      entry({ id: 'a', title: 'Apple' }),
      entry({ id: 'c', title: 'Cherry' }),
    ];
    expect(filterEntries(rows, { sort: 'title' }).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('stage sorts furthest-along first, then by title', () => {
    const rows = [
      entry({ id: 'learn', status: 'to_learn', title: 'A' }),
      entry({ id: 'master2', status: 'mastered', title: 'Z' }),
      entry({ id: 'master1', status: 'mastered', title: 'B' }),
    ];
    expect(filterEntries(rows, { sort: 'stage' }).map((r) => r.id)).toEqual([
      'master1',
      'master2',
      'learn',
    ]);
  });

  it('does not mutate the input array', () => {
    const rows = [entry({ id: 'b', title: 'B' }), entry({ id: 'a', title: 'A' })];
    filterEntries(rows, { sort: 'title' });
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('stageCounts', () => {
  const rows = [
    entry({ id: 'a', status: 'to_learn', title: 'Wonderwall' }),
    entry({ id: 'b', status: 'mastered', title: 'Blackbird' }),
    entry({ id: 'c', status: 'mastered', title: 'Wonderful Tonight' }),
  ];

  it('counts per stage', () => {
    const counts = stageCounts(rows);
    expect(counts.to_learn).toBe(1);
    expect(counts.mastered).toBe(2);
    expect(counts.started).toBe(0);
  });

  // Counts narrow with the search but NOT with the selected stage — otherwise
  // picking a stage zeroes every other chip and strands the user there.
  it('respects the search when counting', () => {
    const counts = stageCounts(rows, 'wonder');
    expect(counts.to_learn).toBe(1);
    expect(counts.mastered).toBe(1);
  });

  it('reports every stage even when empty', () => {
    const counts = stageCounts([]);
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
    expect(Object.keys(counts)).toHaveLength(5);
  });
});
