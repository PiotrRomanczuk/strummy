/**
 * Whole days since `iso`, never negative. The row shows it through the
 * `Assignments.listRowUpdatedAgo` plural so "today" / "119 dni temu" follow
 * the active language instead of a hardcoded English suffix.
 */
export const wholeDaysSince = (iso: string, now: Date = new Date()): number => {
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
  return Number.isFinite(days) && days > 0 ? days : 0;
};

/** Month + day as digits in the active locale: "07/27" in English, "27.07" in Polish. */
export const DUE_SHORT_FORMAT = { month: '2-digit', day: '2-digit' } as const;
