import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { notFound, redirect } from 'next/navigation';

import { LessonDetail } from '@/components/lessons/LessonDetail';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import {
  getLessonAssignments,
  getLessonContinuity,
  getLessonDetail,
} from '@/lib/services/lesson-detail-queries';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

type PageProps = { params: Promise<{ id: string }> };

export default async function LessonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profileId, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/lessons/${id}`);
  }

  const lesson = await getLessonDetail(id);
  if (!lesson) {
    notFound();
  }

  // lesson.teacherId/studentId are profile ids. Against the auth id this was
  // always false, so the Edit affordance never rendered and lesson notes were
  // unreachable through the UI.
  const canEdit = isAdmin || (isTeacher && lesson.teacherId === profileId);
  const [assignments, continuity] = await Promise.all([
    getLessonAssignments(id),
    getLessonContinuity(lesson.studentId, id),
  ]);

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <LessonDetail
        lesson={lesson}
        canEdit={canEdit}
        assignments={assignments}
        continuity={continuity}
        viewerIsStudent={lesson.studentId === profileId}
      />
    </div>
  );
}
