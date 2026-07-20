import '@/app/editorial-tokens.css';

import { redirect } from 'next/navigation';

import { TemplatesListEditorial } from '@/components/assignments/editorial/templates/TemplatesListEditorial';
import { editorialFontClass } from '@/components/_editorial/editorial-fonts';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getAssignmentTemplates } from '@/lib/services/assignment-template-queries';

export default async function AssignmentTemplatesPage() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/assignments/templates');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard/assignments');
  }

  const templates = await getAssignmentTemplates();

  return (
    <div className={editorialFontClass}>
      <TemplatesListEditorial templates={templates} />
    </div>
  );
}
