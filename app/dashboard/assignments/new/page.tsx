import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';

import { AssignmentCreate } from '@/components/assignments/create/AssignmentCreate';
import { themeFontClass } from '@/components/_ui/fonts';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getSongOptions, getStudentOptions } from '@/lib/services/lesson-form-data';
import { getAssignmentTemplates } from '@/lib/services/assignment-template-queries';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function NewAssignmentPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/assignments/new');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard/assignments');
  }

  const [params, students, songs, templates] = await Promise.all([
    searchParams,
    getStudentOptions(user.id, isAdmin),
    getSongOptions(),
    getAssignmentTemplates(),
  ]);

  // `?studentId=` lets a lesson's "add homework" action carry its student over.
  // Only honour it if the id is actually one this teacher can assign to.
  const requestedStudentId = Array.isArray(params.studentId)
    ? params.studentId[0]
    : params.studentId;
  const defaultStudentId = students.some((s) => s.id === requestedStudentId)
    ? requestedStudentId
    : undefined;

  return (
    <div className={themeFontClass}>
      <AssignmentCreate
        mode="create"
        students={students}
        songs={songs}
        templates={templates}
        defaultStudentId={defaultStudentId}
      />
    </div>
  );
}
