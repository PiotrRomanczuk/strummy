import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import { LessonForm } from '@/components/lessons/form/LessonForm';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getSongOptions, getStudentOptions } from '@/lib/services/lesson-form-data';

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

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function NewLessonPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/lessons/new');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard/lessons');
  }

  const [params, students, songs] = await Promise.all([
    searchParams,
    getStudentOptions(user.id, isAdmin),
    getSongOptions(),
  ]);

  // `?studentId=` lets a student page's "Schedule lesson" carry its student over.
  // Only honoured if the id is one this teacher may actually schedule for.
  const requested = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
  const defaultStudentId = students.some((s) => s.id === requested) ? requested : undefined;

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <LessonForm
        mode="create"
        students={students}
        songs={songs}
        defaultStudentId={defaultStudentId}
      />
    </div>
  );
}
