import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { TheoryLessonForm } from '@/components/theory';

export default async function NewLessonPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!isAdmin && !isTeacher) redirect(`/dashboard/theory/${courseId}`);
  const t = await getTranslations('Theory');

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="font-serif text-2xl mb-6">{t('lessonFormNewTitle')}</h1>
      <TheoryLessonForm courseId={courseId} mode="create" />
    </div>
  );
}
