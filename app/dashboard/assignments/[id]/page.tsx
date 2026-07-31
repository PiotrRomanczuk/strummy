import '@/app/design-tokens.css';

import { notFound, redirect } from 'next/navigation';

import { AssignmentDetail } from '@/components/assignments/detail/AssignmentDetail';
import { themeFontClass } from '@/components/shared/fonts';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import {
  getAssignmentDetail,
  getAssignmentHistory,
} from '@/lib/services/assignment-detail-queries';

type PageProps = { params: Promise<{ id: string }> };

export default async function AssignmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/assignments/${id}`);
  }

  const assignment = await getAssignmentDetail(id);
  if (!assignment) {
    notFound();
  }

  const canManage = isAdmin || (isTeacher && assignment.teacherId === user.id);
  const isOwningStudent = isStudent && assignment.studentId === user.id;
  const canAct = canManage || isOwningStudent;

  // ASG-2: teacher/admin view only for now — the RLS policy already scopes
  // students to their own assignment's history too, but the UI stays
  // teacher-first per the roadmap's "at minimum" acceptance criteria.
  const history = canManage ? await getAssignmentHistory(id) : [];

  return (
    <div className={themeFontClass}>
      <AssignmentDetail
        assignment={assignment}
        canManage={canManage}
        canAct={canAct}
        history={history}
      />
    </div>
  );
}
