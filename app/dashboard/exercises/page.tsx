import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { notFound, redirect } from 'next/navigation';

import { ExerciseList } from '@/components/exercises/ExerciseList';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { listSongExercises } from '@/lib/services/song-exercises';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
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
  style: ['normal', 'italic'],
  display: 'swap',
});

/** The exercise library (#1146): parts of songs the teacher saved to practise on their own. Staff only. */
export default async function ExercisesPage() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) redirect('/sign-in?redirect=/dashboard/exercises');
  if (!isAdmin && !isTeacher) notFound();

  const exercises = await listSongExercises();
  return (
    <div
      className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable} min-h-full bg-[var(--ivory)] text-[13px] leading-snug text-[var(--ink)]`}
    >
      <ExerciseList exercises={exercises} />
    </div>
  );
}
