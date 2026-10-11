import { getDueChordIds } from '@/app/actions/chord-srs';
import { ChordQuiz } from '@/components/skills/chord-quiz';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getChordQuizStats } from '@/lib/services/chord-quiz-stats-queries';
import { createClient } from '@/lib/supabase/server';
import { ChordDrillSchema } from '@/schemas/AssignmentSchema';

/**
 * Chord quiz. With `?drill=<assignmentId>` it runs a teacher-assigned drill
 * (ASG-4): the assignment's chord set, scored back onto the assignment. The
 * assignment read is RLS-scoped — a non-owner gets no row and falls through to
 * the normal (SRS/random) quiz, so nothing leaks.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ drill?: string }>;
}) {
  const { drill: drillId } = await searchParams;
  const { profileId } = await getUserWithRolesSSR();
  const stats = profileId ? await getChordQuizStats(profileId, new Date()) : null;
  const progress = { streak: stats?.streak ?? 0, hasPlayedToday: (stats?.sessionsToday ?? 0) > 0 };

  if (drillId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('assignments')
      .select('id, chord_drill')
      .eq('id', drillId)
      .is('deleted_at', null)
      .single();

    const parsed = ChordDrillSchema.safeParse(data?.chord_drill);
    if (data && parsed.success) {
      return (
        <ChordQuiz
          drill={{ assignmentId: data.id, chordIds: parsed.data.chord_ids }}
          {...progress}
        />
      );
    }
    // Drill missing/unreadable — fall through to the normal quiz.
  }

  const result = await getDueChordIds();
  const dueChordIds = 'chordIds' in result ? result.chordIds : [];
  return <ChordQuiz dueChordIds={dueChordIds} {...progress} />;
}
