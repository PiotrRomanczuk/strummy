/**
 * Carry the `?lang=` override across the fretboard's URL sync.
 *
 * The explorer rewrites the query string on every change so the view is
 * shareable. `?lang=pl` is a one-request override (the proxy only honours it
 * on the request that carries it), so dropping it lets the next server
 * render fall back to the saved profile language and the whole page flips
 * back to English a moment after it loaded.
 */
export function keepLangParam(search: string, currentSearch: string): string {
  const lang = new URLSearchParams(currentSearch).get('lang');
  if (!lang) return search;
  const params = new URLSearchParams(search);
  params.set('lang', lang);
  return `?${params.toString()}`;
}
