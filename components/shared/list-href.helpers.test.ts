import { buildListHref, resolveSortLink, toggleValue } from './list-href.helpers';

type Filters = {
  status?: string;
  search?: string;
  sort: 'newest' | 'oldest' | 'title';
  page: number;
  selected?: string;
};

const base: Filters = { sort: 'newest', page: 1 };

const href = (next: Partial<Filters>, current: Filters) =>
  buildListHref('/dashboard/things', next, current, (m) => ({
    status: m.status,
    search: m.search,
    // 'newest' is the default — it must not appear in the URL.
    sort: m.sort !== 'newest' ? m.sort : undefined,
  }));

describe('buildListHref', () => {
  it('returns the bare path when every filter is at its default', () => {
    expect(href({}, base)).toBe('/dashboard/things');
  });

  it('omits defaults so one view has exactly one URL', () => {
    // ?sort=newest&page=1 renders identically to the bare path; both being
    // reachable splits caches and makes tests ambiguous about which to assert.
    expect(href({}, { ...base, sort: 'newest', page: 1 })).toBe('/dashboard/things');
  });

  it('serializes the domain facets it is given', () => {
    expect(href({}, { ...base, status: 'active', search: 'blackbird' })).toBe(
      '/dashboard/things?status=active&search=blackbird'
    );
  });

  it('applies the override on top of current filters', () => {
    expect(href({ status: 'done' }, { ...base, status: 'active' })).toBe(
      '/dashboard/things?status=done'
    );
  });

  it('drops a facet when the override clears it', () => {
    expect(href({ status: undefined }, { ...base, status: 'active' })).toBe('/dashboard/things');
  });

  describe('pagination reset', () => {
    it('resets to page 1 when a filter changes', () => {
      // Page 7 of a freshly-filtered result set is usually empty, which reads
      // to the user as "no results" — the most common list bug.
      expect(href({ status: 'done' }, { ...base, page: 7 })).toBe('/dashboard/things?status=done');
    });

    it('keeps the page when only the page changes', () => {
      expect(href({ page: 3 }, { ...base, page: 7 })).toBe('/dashboard/things?page=3');
    });

    it('keeps the page when the detail panel opens', () => {
      // Opening the panel does not change the list underneath, so sending the
      // user back to page 1 would yank the rows out from under them.
      expect(href({ selected: 'abc' }, { ...base, page: 4 })).toBe(
        '/dashboard/things?page=4&selected=abc'
      );
    });

    it('keeps the page when the detail panel closes', () => {
      expect(href({ selected: undefined }, { ...base, page: 4, selected: 'abc' })).toBe(
        '/dashboard/things?page=4'
      );
    });

    it('keeps page 1 out of the URL', () => {
      expect(href({ page: 1 }, { ...base, page: 5 })).toBe('/dashboard/things');
    });
  });

  it('preserves every other filter when the panel opens', () => {
    const current: Filters = { ...base, status: 'active', search: 'x', sort: 'title', page: 2 };
    expect(href({ selected: 'id-1' }, current)).toBe(
      '/dashboard/things?status=active&search=x&sort=title&page=2&selected=id-1'
    );
  });
});

describe('toggleValue', () => {
  it('sets the value when a different one is active', () => {
    expect(toggleValue('a', 'b')).toBe('b');
  });

  it('clears the value when the active one is clicked again', () => {
    // Tabs and chips toggle rather than trap — otherwise the only way back to
    // "All" is the browser Back button.
    expect(toggleValue('a', 'a')).toBeUndefined();
  });

  it('sets the value when nothing is active', () => {
    expect(toggleValue(undefined, 'a')).toBe('a');
  });
});

describe('resolveSortLink', () => {
  const pair = ['title_asc', 'title_desc'] as const;

  it('offers ascending and shows no arrow when the column is inactive', () => {
    expect(resolveSortLink(pair, 'created_desc')).toEqual({ next: 'title_asc', direction: null });
  });

  it('flips to descending while showing the applied ascending arrow', () => {
    expect(resolveSortLink(pair, 'title_asc')).toEqual({ next: 'title_desc', direction: 'asc' });
  });

  it('flips back to ascending while showing the applied descending arrow', () => {
    expect(resolveSortLink(pair, 'title_desc')).toEqual({ next: 'title_asc', direction: 'desc' });
  });
});
