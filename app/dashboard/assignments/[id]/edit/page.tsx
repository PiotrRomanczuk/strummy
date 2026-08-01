import '@/app/design-tokens.css';

import { notFound, redirect } from 'next/navigation';

import { AssignmentCreate } from '@/components/assignments/create/AssignmentCreate';
import { themeFontClass } from '@/components/shared/fonts.constants';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getAssignmentDetail } from '@/lib/services/assignment-detail-queries';
import { getSongOptions, getStudentOptions } from '@/lib/services/lesson-form-data';
import { SubmissionTypeEnum } from '@/schemas/AssignmentSchema';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditAssignmentPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profileId, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/assignments/${id}/edit`);
  }
  if (!isAdmin && !isTeacher) {
    redirect(`/dashboard/assignments/${id}`);
  }

  const assignment = await getAssignmentDetail(id);
  if (!assignment) {
    notFound();
  }
  // `assignment.teacherId` is a profile id; comparing it to the auth id
  // redirected every non-admin teacher away from their own assignment.
  if (!isAdmin && assignment.teacherId !== profileId) {
    redirect(`/dashboard/assignments/${id}`);
  }

  const [students, songs] = await Promise.all([
    getStudentOptions(profileId, isAdmin),
    getSongOptions(),
  ]);

  return (
    <div className={themeFontClass}>
      <AssignmentCreate
        mode="edit"
        students={students}
        songs={songs}
        initial={{
          assignmentId: assignment.id,
          studentId: assignment.studentId,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          songId: assignment.song?.id ?? null,
          checklist: assignment.checklist,
          chordIds: assignment.chordDrill?.chord_ids ?? [],
          dailyTargetMinutes: assignment.dailyTargetMinutes,
          submissionType: SubmissionTypeEnum.catch('self_report').parse(assignment.submissionType),
        }}
      />
    </div>
  );
}
