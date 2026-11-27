import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { notFound, redirect } from 'next/navigation';

import { ExerciseList } from '@/components/exercises/ExerciseList';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { listExerciseSongs, listSongExercises } from '@/lib/services/song-exercises';
import { parseExerciseListParams } from '@/schemas/ExerciseListParamsSchema';

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

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The exercise library (#1146): parts of songs the teacher saved to practise on their own. Staff only. Filtered by
 * kind, song and name and paged in the query (#1213), so it never loads the whole table.
 */
export default async function ExercisesPage({ searchParams }: PageProps) {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) redirect('/sign-in?redirect=/dashboard/exercises');
  if (!isAdmin && !isTeacher) notFound();

  const params = parseExerciseListParams(await searchParams);
  const [{ exercises, total }, songs] = await Promise.all([
    listSongExercises(params),
    listExerciseSongs(),
  ]);
  return (
    <div
      className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable} min-h-full bg-[var(--ivory)] text-[13px] leading-snug text-[var(--ink)]`}
    >
      <ExerciseList exercises={exercises} total={total} params={params} songs={songs} />
    </div>
  );
}
