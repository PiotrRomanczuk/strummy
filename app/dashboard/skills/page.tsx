import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';

import { getChordsDueCount } from '@/app/actions/chord-srs';
import { greetingName } from '@/components/dashboard/greeting.helpers';
import { greetingFor } from '@/components/dashboard/teacher/teacher-format.helpers';
import { themeFontClass } from '@/components/shared/fonts.constants';
import { QuizHome } from '@/components/skills/QuizHome';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getChordQuizStats } from '@/lib/services/chord-quiz-stats-queries';
import { createClient } from '@/lib/supabase/server';

/**
 * Practice-tools hub, drawn as the Claude Design chord-quiz home: recent
 * accuracy, today's round, the quiz modes and the chords missed most.
 *
 * Not to be confused with the skill-assessment checklist (doc 11); this route
 * owns practice tools only. See the SKL-2 note in `menu.constants.ts`.
 */
export default async function Page() {
  const { user, profileId } = await getUserWithRolesSSR();
  if (!user || !profileId) redirect('/sign-in?redirect=/dashboard/skills');

  const now = new Date();
  const supabase = await createClient();
  const [due, stats, profile] = await Promise.all([
    getChordsDueCount(),
    getChordQuizStats(profileId, now),
    supabase.from('profiles').select('full_name').eq('id', profileId).maybeSingle(),
  ]);

  return (
    <div className={themeFontClass} style={{ minHeight: '100%' }}>
      <QuizHome
        greeting={greetingFor(now)}
        name={greetingName(profile.data?.full_name ?? null, user.email ?? '')}
        stats={stats}
        dueCount={'count' in due ? due.count : 0}
      />
    </div>
  );
}
