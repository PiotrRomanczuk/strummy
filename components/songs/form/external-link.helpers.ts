/** Guards the "open this link" affordance on URL form fields.
 *
 * The field holds free text the user is mid-way through typing, so most of the
 * time it is NOT a usable URL. Returning undefined for anything that is not an
 * absolute http(s) URL keeps a half-typed value, a relative path, or a
 * `javascript:` payload from ever reaching an anchor's href — the same failure
 * class as the empty-href CTA bug fixed in #663. */
export const openableHref = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
  if (!parsed.hostname) return undefined;

  return parsed.toString();
};
