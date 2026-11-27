/**
 * Calendar days for billing are Warsaw days, whatever time zone the server runs
 * in — the same rule the balance trigger uses for the billing start date.
 */

/** Today's date in Warsaw as `YYYY-MM-DD`. */
export function warsawToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** `YYYY-MM-DD` plus whole days, across month and year ends. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** The payment due date of a package sold now. */
export function dueOnFor(now: Date, paymentTermDays: number): string {
  return addDays(warsawToday(now), paymentTermDays);
}

/**
 * A `YYYY-MM-DD` day as the viewer reads it. Noon UTC keeps the day the same
 * in every time zone; a bare `new Date('2026-11-21')` is midnight UTC, which
 * west of Greenwich is still the 20th.
 */
export function formatBillingDay(isoDate: string, locale: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(locale, { timeZone: 'UTC' });
}
