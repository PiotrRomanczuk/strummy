import '@/app/editorial-tokens.css';

import { redirect } from 'next/navigation';

import { TemplateEditEditorial } from '@/components/assignments/editorial/templates/TemplateEditEditorial';
import { editorialFontClass } from '@/components/_editorial/editorial-fonts';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

export default async function NewAssignmentTemplatePage() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/assignments/templates/new');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard/assignments');
  }

  return (
    <div className={editorialFontClass}>
      <TemplateEditEditorial mode="create" teacherId={user.id} />
    </div>
  );
}
