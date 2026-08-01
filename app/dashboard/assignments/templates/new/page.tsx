import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';

import { TemplateEdit } from '@/components/assignments/templates/TemplateEdit';
import { themeFontClass } from '@/components/shared/fonts.constants';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

export default async function NewAssignmentTemplatePage() {
  const { user, profileId, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/assignments/templates/new');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard/assignments');
  }

  return (
    <div className={themeFontClass}>
      <TemplateEdit mode="create" teacherId={profileId} />
    </div>
  );
}
