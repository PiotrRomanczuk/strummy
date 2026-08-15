import '@/app/design-tokens.css';

import { notFound, redirect } from 'next/navigation';

import { AssignmentDetail } from '@/components/assignments/detail/AssignmentDetail';
import { themeFontClass } from '@/components/shared/fonts.constants';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import {
  getAssignmentDetail,
  getAssignmentHistory,
} from '@/lib/services/assignment-detail-queries';

type PageProps = { params: Promise<{ id: string }> };

export default async function AssignmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profileId, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/assignments/${id}`);
  }

  const assignment = await getAssignmentDetail(id);
  if (!assignment) {
    notFound();
  }

  // teacherId/studentId are profile ids. Comparing them to `user.id` (the auth
  // id) made both checks permanently false, so a teacher could not act on their
  // own assignment and a student could not act on their own homework.
  const canManage = isAdmin || (isTeacher && assignment.teacherId === profileId);
  const isOwningStudent = isStudent && assignment.studentId === profileId;
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
