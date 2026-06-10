/**
 * Slug → real Unsplash photo ID. Every entry is verified free under the
 * Unsplash License (no premium / Unsplash+ photos).
 *
 * To swap a photo, replace the value here with another `<numeric-id>` from
 * `https://unsplash.com/photos/<page-slug>` (look in page source for
 * `images.unsplash.com/photo-<numeric-id>`).
 *
 * If a slug is missing from this map, `photo()` falls back to picsum.photos
 * so the page still renders.
 */
const UNSPLASH: Record<string, { id: string; page: string; alt: string }> = {
  'hero-teacher-couch': {
    id: '1758687126753-3fc546c4ee67',
    page: 'hH6wPffVwQ0',
    alt: 'Father and son playing guitar together on a sofa',
  },
  'hero-laptop-laugh': {
    id: '1685703205838-d5c033d41fe7',
    page: 'chezYu8mbr8',
    alt: 'Two women collaborating on a laptop on a couch',
  },
  'hero-fretboard-hands': {
    id: '1535587566541-97121a128dc5',
    page: 'C7RFkKvThG4',
    alt: 'Close-up of hands on an acoustic guitar fretboard',
  },
  'texture-concrete': {
    id: '1565419672978-6ba05e8859d5',
    page: '55nuS2rUYmQ',
    alt: 'Warm-toned concrete wall texture',
  },
  'reality-spreadsheet': {
    id: '1499750310107-5fef28a66643',
    page: 'cckf4TsHAuw',
    alt: 'Laptop and ceramic mug on a wooden table',
  },
  'efficiency-planning': {
    id: '1725673854786-c0ea7bd67026',
    page: 'Sc55Bu9MU2w',
    alt: 'Person writing notes on sheet music',
  },
  'efficiency-student-smile': {
    id: '1519836957270-ef1076fbae8f',
    page: 'dVF5aCV6ZFk',
    alt: 'Person playing acoustic guitar in a living room',
  },
  'efficiency-sheet-music': {
    id: '1717699842237-ed00f20cdab3',
    page: 'NWXeG_LdlYQ',
    alt: 'Handwritten musical score on paper',
  },
  'workflow-monday': {
    id: '1674824043348-7dd35ef520e7',
    page: 'WF1II9nnnaQ',
    alt: 'Acoustic guitar close-up in warm morning light',
  },
  'workflow-wednesday': {
    id: '1587403062064-b4cf160bde62',
    page: '9j4PH2hXJS8',
    alt: 'Woman playing a brown acoustic guitar',
  },
  'workflow-friday': {
    id: '1585747170385-cc147d44f8e8',
    page: '3bNIp5KhRhg',
    alt: 'Man playing acoustic guitar in warm evening light',
  },
};

/**
 * Resolves a slug to a usable image URL.
 *
 * - If the slug is mapped above, returns the Unsplash CDN URL with
 *   `auto=format&fit=crop&q=80` at the requested dimensions.
 * - Otherwise falls back to a seeded picsum.photos URL so the page still
 *   renders during development.
 */
export function photo(slug: string, w: number, h: number): string {
  const entry = UNSPLASH[slug];
  if (entry) {
    return `https://images.unsplash.com/photo-${entry.id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
  }
  return `https://picsum.photos/seed/${slug}/${w}/${h}`;
}

/** Returns the human-readable alt for a slug, or empty string if unknown. */
export function photoAlt(slug: string): string {
  return UNSPLASH[slug]?.alt ?? '';
}

/** Returns the source Unsplash page URL (for attribution / license trail). */
export function photoSource(slug: string): string | null {
  const entry = UNSPLASH[slug];
  return entry ? `https://unsplash.com/photos/${entry.page}` : null;
}
