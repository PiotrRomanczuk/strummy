import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';

import { TemplatesList } from '@/components/assignments/templates/TemplatesList';
import { editorialFontClass } from '@/components/_ui/fonts';
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
      <TemplatesList templates={templates} />
    </div>
  );
}
