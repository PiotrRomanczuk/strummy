import { practiceStreak } from '@/components/users/student-detail-stats.helpers';
import { getStudentPracticeHistory } from '@/lib/services/student-health-queries';
import {
  getLessonHomework,
  getStudentHomeNextLesson,
  getStudentLastLesson,
  getStudentPracticeSet,
} from '@/lib/services/student-home-queries';
import {
  getStudentHomeActivity,
  getStudentHomeRepertoire,
} from '@/lib/services/student-home-repertoire-queries';

import {
  deriveAchievements,
  featuredAchievements,
  timeAgo,
  weekStrip,
} from './student-home.helpers';

const HISTORY_DAYS = 120;

/** Everything the student dashboard renders, fetched in parallel where it can be. */
export async function loadStudentHome(profileId: string, now: Date) {
  const [nextLesson, lastLesson, practiceSet, repertoire, activity, history] = await Promise.all([
    getStudentHomeNextLesson(profileId, now),
    getStudentLastLesson(profileId, now),
    getStudentPracticeSet(profileId, now),
    getStudentHomeRepertoire(profileId),
    getStudentHomeActivity(profileId),
    getStudentPracticeHistory(profileId, HISTORY_DAYS, now),
  ]);
  const homework = lastLesson ? await getLessonHomework(profileId, lastLesson.id, now) : [];

  const streak = practiceStreak(history, now);
  const week = weekStrip(history, now);
  const minutesToday = week.find((d) => d.isToday)?.minutes ?? 0;
  const achievements = deriveAchievements({
    sessions: history.filter((d) => d.minutes > 0).length,
    streak,
    songs: repertoire.length,
    mastered: repertoire.filter((s) => s.status === 'mastered').length,
    practiceMinutes: repertoire.reduce((sum, s) => sum + s.minutes, 0),
  });
  const agoBySong = Object.fromEntries(
    repertoire.map((s) => [s.songId, s.lastPracticedAt ? timeAgo(s.lastPracticedAt, now) : null])
  );

  return {
    nextLesson,
    lastLesson,
    homework,
    practiceSet,
    minutesToday,
    week,
    streak,
    repertoire,
    agoBySong,
    activity,
    achievements: {
      featured: featuredAchievements(achievements),
      unlocked: achievements.filter((a) => a.isUnlocked).length,
      total: achievements.length,
    },
  };
}

export type StudentHomeData = Awaited<ReturnType<typeof loadStudentHome>>;
