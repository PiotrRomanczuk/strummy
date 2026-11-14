/**
 * Money maths for lesson packages. Everything is integer grosze — floats only
 * appear at the two edges: the teacher's typed price and `profiles.lesson_rate`.
 */

type PackagePriceInput = {
  /** `profiles.lesson_rate`: zł per lesson, set per student. Overrides the price list. */
  lessonRate: number | null | undefined;
  lessonCount: number;
  /** The package's list price in grosze. */
  priceCents: number;
};

/** What this student pays for this package: their own rate × lessons, else the list price. */
export function packagePriceCents({ lessonRate, lessonCount, priceCents }: PackagePriceInput) {
  if (lessonRate == null || !Number.isFinite(lessonRate) || lessonRate <= 0) return priceCents;
  return Math.round(lessonRate * 100) * lessonCount;
}

/**
 * "480", "480,50", "1 200.5" → grosze. Null when the text is not an amount, is
 * negative, or has more than two decimals — a typo must not become a price.
 */
export function parsePlnToCents(text: string): number | null {
  const normalized = text.replace(/\s|zł/gi, '').replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Grosze → the text a price input shows: "480" or "480,50". */
export function centsToPlnInput(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = cents % 100;
  return fraction === 0 ? String(whole) : `${whole},${String(fraction).padStart(2, '0')}`;
}

/** Grosze → "480,00 zł" in the viewer's locale. */
export function formatPln(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale.startsWith('en') ? 'en-GB' : locale, {
    style: 'currency',
    currency: 'PLN',
  }).format(cents / 100);
}
