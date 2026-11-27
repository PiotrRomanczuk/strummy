import { buildListHref, type ListBaseFilters } from '@/components/shared/list-href.helpers';
import type { TeacherLeadStatus } from '@/schemas/TeacherLeadSchema';

/**
 * URL state of the admin lead list (`/dashboard/admin/teacher-leads`). The
 * whole view lives in the query string, so a filtered page is a link.
 */

export const TEACHER_LEADS_PATH = '/dashboard/admin/teacher-leads';
export const TEACHER_LEADS_PAGE_SIZE = 25;

export const TEACHER_LEADS_FILTERS = ['all', 'unhandled'] as const;
export type TeacherLeadsFilter = (typeof TEACHER_LEADS_FILTERS)[number];

export type TeacherLeadsParams = ListBaseFilters & { filter: TeacherLeadsFilter };
export type RawTeacherLeadsParams = { page?: string | string[]; filter?: string | string[] };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseTeacherLeadsParams(raw: RawTeacherLeadsParams): TeacherLeadsParams {
  const page = Number.parseInt(first(raw.page) ?? '', 10);
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    filter: first(raw.filter) === 'unhandled' ? 'unhandled' : 'all',
  };
}

export const teacherLeadsHref = (
  next: Partial<TeacherLeadsParams>,
  current: TeacherLeadsParams
): string =>
  buildListHref(TEACHER_LEADS_PATH, next, current, (merged) => ({
    filter: merged.filter === 'unhandled' ? 'unhandled' : undefined,
  }));

/** Inclusive row range of a page, as Supabase's `.range()` takes it. */
export function pageRange(page: number, size = TEACHER_LEADS_PAGE_SIZE): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1];
}

export const totalPagesFor = (count: number, size = TEACHER_LEADS_PAGE_SIZE) =>
  Math.max(1, Math.ceil(count / size));

/**
 * "Replied" is any status past `new`: `contacted` is what the button sets,
 * and a lead already marked `converted` or `declined` has been answered too.
 */
export const isLeadHandled = (status: TeacherLeadStatus) => status !== 'new';
