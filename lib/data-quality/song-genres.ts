/**
 * Canonical song genres. `songs.category` is free text (31 spellings in the
 * 2026-07 backup), so the quality profile measures it against this list and
 * suggests the canonical spelling for known aliases.
 */
export const CANONICAL_GENRES = [
  'Rock',
  'Classic Rock',
  'Hard Rock',
  'Alternative',
  'Indie',
  'Grunge',
  'Britpop',
  'Metal',
  'Blues',
  'Folk',
  'Folk Rock',
  'Country',
  'Pop',
  'Reggae',
  'Soul',
  'Jazz',
  'Punk',
  'Punk Rock',
  'Progressive Rock',
  'Latin Rock',
  'Polish Rock',
  'Polish Pop',
  'Poezja śpiewana',
  'Kolędy',
] as const;

export type CanonicalGenre = (typeof CANONICAL_GENRES)[number];

const GENRE_ALIASES: Record<string, CanonicalGenre> = {
  'alternative rock': 'Alternative',
  'alt-rock': 'Alternative',
  'indie folk': 'Folk',
  'indie rock': 'Indie',
  'acoustic pop': 'Pop',
  'pop/rock': 'Pop',
  'pop rock': 'Pop',
  'reggae pop': 'Reggae',
  'folk/rock': 'Folk Rock',
  'folk/country': 'Folk',
  'country/folk': 'Country',
  'country/rock': 'Country',
  'alt-country': 'Country',
  'rock/blues': 'Blues',
  'blues rock': 'Blues',
  '2000s rock': 'Rock',
  'metal ballad': 'Metal',
  'heavy metal': 'Metal',
  'polski rock': 'Polish Rock',
  'polski pop': 'Polish Pop',
  koledy: 'Kolędy',
  'instrumental rock': 'Rock',
  'acoustic rock': 'Rock',
  'rock/folk': 'Folk Rock',
  'thrash metal': 'Metal',
  'progressive metal': 'Metal',
  'neoclassical metal': 'Metal',
};

const CANONICAL_BY_LOWER = new Map<string, CanonicalGenre>(
  CANONICAL_GENRES.map((genre) => [genre.toLowerCase(), genre])
);

export function isCanonicalGenre(value: string): value is CanonicalGenre {
  return (CANONICAL_GENRES as readonly string[]).includes(value);
}

/** Canonical spelling for a raw category, or null when it is unknown. */
export function suggestCanonicalGenre(raw: string): CanonicalGenre | null {
  const key = raw.trim().toLowerCase();
  return CANONICAL_BY_LOWER.get(key) ?? GENRE_ALIASES[key] ?? null;
}
