import { useEffect, useState } from 'react';

import { searchTopbar, type TopbarSearchResults } from '@/app/actions/topbar-search';

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const NO_RESULTS: TopbarSearchResults = { songs: [], students: [] };

/**
 * Results for `query`. The previous answer stays on screen while the next one
 * loads, and an answer to an older query is dropped when it lands late.
 */
export function useTopbarSearch(query: string) {
  const [answer, setAnswer] = useState({ query: '', results: NO_RESULTS });
  const isSearchable = query.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isSearchable) return;

    let isStale = false;
    const timer = setTimeout(async () => {
      const results = await searchTopbar(query).catch(() => NO_RESULTS);
      if (!isStale) setAnswer({ query, results });
    }, DEBOUNCE_MS);

    return () => {
      isStale = true;
      clearTimeout(timer);
    };
  }, [query, isSearchable]);

  return {
    results: isSearchable ? answer.results : NO_RESULTS,
    isSearching: isSearchable && answer.query !== query,
  };
}
