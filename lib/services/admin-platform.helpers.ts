import { logger } from '@/lib/logger';

/** Pure helpers behind admin-platform-queries: paging, tenure cohorts, drift. */

const DAY = 86_400_000;
const PAGE = 1000;

export type PlatformStudent = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_color: string | null;
  created_at: string;
};

export type AdminCohort = {
  key: 'new' | 'active' | 'long';
  count: number;
  healthy: number;
  atRisk: number;
  dormant: number;
};

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Every row of a query — PostgREST caps a response at 1000 rows by default. */
export async function fetchAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) {
      logger.warn('[admin-platform] query error', { error: error.message });
      break;
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** Practice gap that counts as "drifting": past a week, within a quarter. */
export const isDrifting = (days: number | null) => days != null && days > 7 && days <= 90;

export const startOfWeek = (now: Date) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};

/** Students by tenure, split by practice recency: ≤7d healthy, 8–30 at risk, else dormant. */
export const buildCohorts = (
  students: PlatformStudent[],
  quiet: (s: PlatformStudent) => number | null,
  now: number
): AdminCohort[] => {
  const tenure = (s: PlatformStudent): AdminCohort['key'] => {
    const months = (now - Date.parse(s.created_at)) / (30 * DAY);
    return months < 3 ? 'new' : months < 12 ? 'active' : 'long';
  };
  return (['new', 'active', 'long'] as const).map((key) => {
    const days = students.filter((s) => tenure(s) === key).map(quiet);
    return {
      key,
      count: days.length,
      healthy: days.filter((d) => d != null && d <= 7).length,
      atRisk: days.filter((d) => d != null && d > 7 && d <= 30).length,
      dormant: days.filter((d) => d == null || d > 30).length,
    };
  });
};
