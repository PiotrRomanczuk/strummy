import { notFound } from 'next/navigation';
import { ChapterReader } from '@/components/theory';
import { getTheoryLesson, getTheoryCourse } from '@/app/dashboard/theory/actions';

type ChapterNav = { id: string; title: string };
type LessonRow = { id: string; title: string; sort_order: number };

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;

  const [lesson, course] = await Promise.all([
    getTheoryLesson(lessonId),
    getTheoryCourse(courseId),
  ]);

  if (!lesson || !course) notFound();

  const lessons = (course.lessons ?? []) as LessonRow[];
  const idx = lessons.findIndex((l) => l.id === lessonId);

  const prevChapter: ChapterNav | null =
    idx > 0 ? { id: lessons[idx - 1].id, title: lessons[idx - 1].title } : null;
  const nextChapter: ChapterNav | null =
    idx < lessons.length - 1 ? { id: lessons[idx + 1].id, title: lessons[idx + 1].title } : null;

  return (
    <ChapterReader
      courseId={courseId}
      courseTitle={course.title}
      lesson={{
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        updated_at: lesson.updated_at,
      }}
      prevChapter={prevChapter}
      nextChapter={nextChapter}
    />
  );
}
