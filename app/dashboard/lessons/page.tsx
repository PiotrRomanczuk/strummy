import '@/app/editorial-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import { LessonsListEditorial } from '@/components/lessons/editorial/LessonsListEditorial';
import { yearOptions } from '@/components/lessons/editorial/LessonsListEditorial.helpers';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import {
  getLessonsBreakdown,
  getRecentLessons,
  LESSONS_PAGE_SIZE,
} from '@/lib/services/lessons-queries';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

const STATUS_KEYS = new Set(['scheduled', 'in_progress', 'completed', 'cancelled']);

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const parseStatuses = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(',') : value;
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => STATUS_KEYS.has(s));
};

const parsePage = (value: string | string[] | undefined): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? '1', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const parseYear = (value: string | string[] | undefined): number | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const year = Number.parseInt(raw, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return undefined;
  return year;
};

export default async function LessonsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/lessons');
  }

  const params = await searchParams;
  const activeStatuses = parseStatuses(params.status);
  const activeSort: 'newest' | 'oldest' = params.sort === 'oldest' ? 'oldest' : 'newest';
  const activeYear = parseYear(params.year);
  // A `sort=` param flips the grouped timeline into a flat, fully-sorted table.
  const flat = params.sort === 'newest' || params.sort === 'oldest';
  const years = yearOptions(new Date());
  const activePage = parsePage(params.page);

  const viewer = { isAdmin, isTeacher, isStudent };
  // The breakdown is intentionally NOT status-filtered — the chips must keep
  // showing their own counts while one of them is active.
  const [lessons, breakdown] = await Promise.all([
    getRecentLessons(user.id, viewer, {
      statuses: activeStatuses.length > 0 ? activeStatuses : undefined,
      sort: activeSort,
      year: activeYear,
      page: activePage,
    }),
    getLessonsBreakdown(user.id, viewer, { year: activeYear }),
  ]);

  // Total for the ACTIVE filter, so the pager knows how many pages exist.
  const matchingTotal =
    activeStatuses.length > 0
      ? activeStatuses.reduce((sum, s) => sum + (breakdown.byStatus[s] ?? 0), 0)
      : breakdown.total;
  const pageCount = Math.max(1, Math.ceil(matchingTotal / LESSONS_PAGE_SIZE));
  const canCreate = isTeacher || isAdmin;
  const showStudentColumn = isTeacher || isAdmin;
  // Admins view multiple teachers' lessons, so surface who teaches each one.
  const showTeacherColumn = isAdmin;

  return (
    <div className={`theme-editorial ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <LessonsListEditorial
        lessons={lessons}
        breakdown={breakdown}
        canCreate={canCreate}
        showStudentColumn={showStudentColumn}
        showTeacherColumn={showTeacherColumn}
        activeStatuses={activeStatuses}
        activeSort={activeSort}
        activeYear={activeYear}
        activePage={activePage}
        pageCount={pageCount}
        flat={flat}
        years={years}
      />
    </div>
  );
}
