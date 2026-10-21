import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getPracticeSessions, getStudentRepertoireSongs } from '@/app/actions/practice';
import { Practice } from '@/components/practice';
import type { RepertoireSongOption } from '@/components/practice';
import { themeFontClass } from '@/components/shared/fonts.constants';

/**
 * Practice page (spec 05, net-new). Lists the signed-in student's practice
 * sessions and lets them log a new one or undo a session logged today.
 *
 * Wrapped in `theme-strummy` like every other dashboard page: without it the
 * page fell back to stock shadcn (bold sans, brown button) and read as a
 * different product next to Repertoire (walkthrough review, P4).
 */
export default async function PracticePage() {
  const { user } = await getUserWithRolesSSR();
  if (!user) redirect('/sign-in');

  const [sessionsResult, songsResult] = await Promise.all([
    getPracticeSessions(),
    getStudentRepertoireSongs(),
  ]);

  const sessions = 'sessions' in sessionsResult ? sessionsResult.sessions : [];
  const songs: RepertoireSongOption[] = 'songs' in songsResult ? songsResult.songs : [];

  return (
    <div className={`${themeFontClass} min-h-full bg-[var(--ivory)] text-[var(--ink)]`}>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Practice sessions={sessions} songs={songs} isOwnPractice />
      </div>
    </div>
  );
}
