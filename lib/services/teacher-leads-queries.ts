import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { TeacherLeadRow } from '@/schemas/TeacherLeadSchema';

/** The columns the admin list shows — contact details and triage, not the free-text answers. */
export type TeacherLeadListItem = Pick<
  TeacherLeadRow,
  'id' | 'created_at' | 'full_name' | 'email' | 'locale' | 'source' | 'status'
>;

export type TeacherLeadPage = { leads: TeacherLeadListItem[]; count: number };

export type TeacherLeadQuery = {
  /** Inclusive row range, as `.range()` takes it. */
  from: number;
  to: number;
  isUnhandledOnly: boolean;
};

const COLUMNS = 'id, created_at, full_name, email, locale, source, status';

/**
 * One page of `/for-teachers` leads, newest first, paginated in the query.
 * Runs as the signed-in user, so RLS (`teacher_leads_select_admin`) decides
 * what comes back: a non-admin gets an empty page, never anyone's contact details.
 */
export async function getTeacherLeads({
  from,
  to,
  isUnhandledOnly,
}: TeacherLeadQuery): Promise<TeacherLeadPage> {
  const supabase = await createClient();

  let query = supabase
    .from('teacher_leads')
    .select(COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (isUnhandledOnly) query = query.eq('status', 'new');

  const { data, count, error } = await query;
  if (error) {
    logger.error('[teacher-leads] list failed', { message: error.message });
    return { leads: [], count: 0 };
  }
  return { leads: (data ?? []) as TeacherLeadListItem[], count: count ?? 0 };
}
