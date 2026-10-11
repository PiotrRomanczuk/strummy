import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';

import { themeFontClass } from '@/components/shared/fonts.constants';
import { QuizHistory } from '@/components/skills/QuizHistory';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getChordQuizHistory } from '@/lib/services/chord-quiz-history-queries';

/** Chord quiz history — the student's own answers only (RLS-scoped table). */
export default async function Page() {
  const { user, profileId } = await getUserWithRolesSSR();
  if (!user || !profileId) redirect('/sign-in?redirect=/dashboard/skills/history');
  const history = await getChordQuizHistory(profileId, new Date());
  return (
    <div className={themeFontClass} style={{ minHeight: '100%' }}>
      <QuizHistory history={history} />
    </div>
  );
}
