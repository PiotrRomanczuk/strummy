import { redirect } from 'next/navigation';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getTeacherLeads } from '@/lib/services/teacher-leads-queries';
import { TeacherLeads } from '@/components/admin/teacher-leads/TeacherLeads';
import {
  TEACHER_LEADS_PATH,
  pageRange,
  parseTeacherLeadsParams,
  type RawTeacherLeadsParams,
} from '@/components/admin/teacher-leads/teacher-leads.helpers';

export const metadata = { title: 'Teacher leads' };

type PageProps = { searchParams: Promise<RawTeacherLeadsParams> };

/**
 * Leads from the public `/for-teachers` form. Admin only — the check is here,
 * on the server, not just in the sidebar; RLS on `teacher_leads` backs it up.
 */
export default async function TeacherLeadsPage({ searchParams }: PageProps) {
  const { user, isAdmin } = await getUserWithRolesSSR();
  if (!user) redirect(`/sign-in?redirect=${TEACHER_LEADS_PATH}`);
  if (!isAdmin) redirect('/dashboard');

  const params = parseTeacherLeadsParams(await searchParams);
  const [from, to] = pageRange(params.page);
  const page = await getTeacherLeads({ from, to, isUnhandledOnly: params.filter === 'unhandled' });

  return (
    <div className="px-4 py-6 md:px-8 md:py-7">
      <TeacherLeads page={page} params={params} />
    </div>
  );
}
