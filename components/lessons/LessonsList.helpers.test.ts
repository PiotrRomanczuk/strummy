import {
  buildHref,
  sortColumnLink,
  toggleStatus,
  yearOptions,
  type LessonsListFilters,
} from './lessons-list.helpers';

/**
 * Rewritten for the list-table standard
 * (docs/app-blueprint/reference/LIST_TABLE_PATTERN.md): the four positional
 * href builders (pageHref/statusHref/sortHref/yearHref) collapsed into one
 * `buildHref(next, current)`, and the list gained `?selected=` for the panel.
 */

const base: LessonsListFilters = {
  statuses: [],
  sort: 'newest',
  year: undefined,
  flat: false,
  page: 1,
};

describe('buildHref — defaults', () => {
  it('returns the bare path when nothing is filtered', () => {
    expect(buildHref({}, base)).toBe('/dashboard/lessons');
  });

  it('omits sort while grouped, which is what keeps the view grouped', () => {
    expect(buildHref({}, { ...base, sort: 'oldest', flat: false })).toBe('/dashboard/lessons');
  });

  it('emits sort once flat', () => {
    expect(buildHref({}, { ...base, sort: 'oldest', flat: true })).toBe(
      '/dashboard/lessons?sort=oldest'
    );
  });
});

describe('buildHref — status facet', () => {
  it('serializes selected statuses as a comma list', () => {
    expect(buildHref({ statuses: ['scheduled', 'completed'] }, base)).toBe(
      '/dashboard/lessons?status=scheduled%2Ccompleted'
    );
  });

  it('drops the param when all four are selected, since that is the same view as none', () => {
    const all = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    expect(buildHref({ statuses: all }, base)).toBe('/dashboard/lessons');
  });

  it('preserves the year alongside a status change', () => {
    expect(buildHref({ statuses: ['scheduled'] }, { ...base, year: 2026 })).toBe(
      '/dashboard/lessons?status=scheduled&year=2026'
    );
  });
});

describe('buildHref — pagination reset', () => {
  it('returns to page 1 when a filter changes', () => {
    expect(buildHref({ statuses: ['scheduled'] }, { ...base, page: 5 })).toBe(
      '/dashboard/lessons?status=scheduled'
    );
  });

  it('returns to page 1 when the year changes', () => {
    expect(buildHref({ year: 2025 }, { ...base, page: 5 })).toBe('/dashboard/lessons?year=2025');
  });

  it('keeps the page when only the page changes', () => {
    expect(buildHref({ page: 3 }, { ...base, page: 5 })).toBe('/dashboard/lessons?page=3');
  });

  it('keeps the page when the panel opens, so rows do not shift underneath', () => {
    expect(buildHref({ selected: 'lesson-1' }, { ...base, page: 4 })).toBe(
      '/dashboard/lessons?page=4&selected=lesson-1'
    );
  });

  it('keeps the page when the panel closes', () => {
    expect(buildHref({ selected: undefined }, { ...base, page: 4, selected: 'lesson-1' })).toBe(
      '/dashboard/lessons?page=4'
    );
  });
});

describe('buildHref — panel', () => {
  it('preserves every active filter when opening the panel', () => {
    const current: LessonsListFilters = {
      statuses: ['scheduled'],
      sort: 'title_asc',
      year: 2026,
      flat: true,
      page: 2,
    };
    expect(buildHref({ selected: 'abc' }, current)).toBe(
      '/dashboard/lessons?status=scheduled&sort=title_asc&year=2026&page=2&selected=abc'
    );
  });
});

describe('toggleStatus', () => {
  it('adds a status that is not active', () => {
    expect(toggleStatus(['scheduled'], 'completed')).toEqual(['scheduled', 'completed']);
  });

  it('removes one that already is', () => {
    expect(toggleStatus(['scheduled', 'completed'], 'scheduled')).toEqual(['completed']);
  });
});

describe('sortColumnLink', () => {
  it('offers ascending and shows no arrow while the list is grouped', () => {
    // Nothing owns the ordering in grouped mode, so no column may claim it.
    const { href, direction } = sortColumnLink('title', base);
    expect(direction).toBeNull();
    expect(href).toBe('/dashboard/lessons?sort=title_asc');
  });

  it('enters flat mode when a column is picked', () => {
    expect(sortColumnLink('status', base).href).toContain('sort=status_asc');
  });

  it('flips to descending and shows the applied arrow when active', () => {
    const current: LessonsListFilters = { ...base, sort: 'title_asc', flat: true };
    const { href, direction } = sortColumnLink('title', current);
    expect(direction).toBe('asc');
    expect(href).toBe('/dashboard/lessons?sort=title_desc');
  });

  it('flips back to ascending from descending', () => {
    const current: LessonsListFilters = { ...base, sort: 'title_desc', flat: true };
    const { href, direction } = sortColumnLink('title', current);
    expect(direction).toBe('desc');
    expect(href).toBe('/dashboard/lessons?sort=title_asc');
  });

  it('shows no arrow on a column that is not the active sort', () => {
    const current: LessonsListFilters = { ...base, sort: 'title_asc', flat: true };
    expect(sortColumnLink('status', current).direction).toBeNull();
  });

  it('maps the date column onto the legacy newest/oldest values', () => {
    // Those values predate the sortable headers and are in bookmarks.
    const current: LessonsListFilters = { ...base, sort: 'newest', flat: true };
    const { href, direction } = sortColumnLink('date', current);
    expect(direction).toBe('desc');
    expect(href).toBe('/dashboard/lessons?sort=oldest');
  });
});

describe('yearOptions', () => {
  it('offers the current year and the two before it', () => {
    expect(yearOptions(new Date('2026-08-09T00:00:00Z'))).toEqual([2026, 2025, 2024]);
  });
});
