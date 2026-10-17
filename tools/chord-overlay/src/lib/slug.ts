const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function assertValidSlug(slug: string): string {
  if (!isValidSlug(slug)) throw new Error(`Invalid slug: ${slug}`);
  return slug;
}
