import '@/app/editorial-tokens.css';

import { notFound, redirect } from 'next/navigation';

import { TemplateEditEditorial } from '@/components/assignments/editorial/templates/TemplateEditEditorial';
import { editorialFontClass } from '@/components/_editorial/editorial-fonts';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getAssignmentTemplate } from '@/lib/services/assignment-template-queries';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditAssignmentTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/assignments/templates/${id}`);
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard/assignments');
  }

  const template = await getAssignmentTemplate(id);
  if (!template) {
    notFound();
  }

  return (
    <div className={editorialFontClass}>
      <TemplateEditEditorial
        mode="edit"
        teacherId={user.id}
        initial={{
          id: template.id,
          title: template.title,
          description: template.description,
          checklist: template.checklist,
        }}
      />
    </div>
  );
}
