import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';

import { AssignmentCreate } from '@/components/assignments/create/AssignmentCreate';
import { themeFontClass } from '@/components/_ui/fonts';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getSongOptions, getStudentOptions } from '@/lib/services/lesson-form-data';
import { getAssignmentTemplates } from '@/lib/services/assignment-template-queries';

export default async function NewAssignmentPage() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/assignments/new');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard/assignments');
  }

  const [students, songs, templates] = await Promise.all([
    getStudentOptions(user.id, isAdmin),
    getSongOptions(),
    getAssignmentTemplates(),
  ]);

  return (
    <div className={themeFontClass}>
      <AssignmentCreate
        mode="create"
        students={students}
        songs={songs}
        templates={templates}
      />
    </div>
  );
}
