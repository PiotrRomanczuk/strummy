import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { TheoryLessonForm } from '@/components/theory';
import { getTheoryLesson } from '@/app/dashboard/theory/actions';

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!isAdmin && !isTeacher) redirect(`/dashboard/theory/${courseId}/${lessonId}`);

  const [lesson, t] = await Promise.all([getTheoryLesson(lessonId), getTranslations('Theory')]);
  if (!lesson) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="font-serif text-2xl mb-6">{t('lessonFormEditTitle')}</h1>
      <TheoryLessonForm
        courseId={courseId}
        mode="edit"
        lessonId={lessonId}
        defaultValues={{
          title: lesson.title,
          content: lesson.content,
          excerpt: lesson.excerpt ?? '',
          is_published: lesson.is_published,
        }}
      />
    </div>
  );
}
