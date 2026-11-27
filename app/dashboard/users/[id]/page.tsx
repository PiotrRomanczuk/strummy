import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { notFound, redirect } from 'next/navigation';

import { StudentDetail } from '@/components/users/StudentDetail';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getStudentFeatures } from '@/lib/services/student-feature-access';
import { getStudentBilling } from '@/lib/services/billing/student-billing-queries';
import { getStudentParent } from '@/lib/services/student-parent-queries';
import { canEditStudent } from '@/lib/services/teacher-student-edit';
import {
  getStudentCompletedLessonCount,
  getStudentPreferences,
  getStudentProfile,
  getStudentRecentLessons,
  getStudentRepertoire,
} from '@/lib/services/student-detail-queries';
import {
  getStudentNextLesson,
  getStudentPracticeHistory,
  getStudentPracticeSessions,
} from '@/lib/services/student-health-queries';
import { getSkills, getStudentSkills } from '@/app/actions/student-skills';

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

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profileId, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect(`/sign-in?redirect=/dashboard/users/${id}`);
  }

  const profile = await getStudentProfile(id);
  if (!profile) {
    notFound();
  }

  const [
    repertoire,
    lessons,
    preferences,
    practiceHistory,
    practiceSessions,
    nextLesson,
    studentSkills,
    availableSkills,
    lessonsCompleted,
    enabledFeatures,
    billing,
    parent,
    canEditProfile,
  ] = await Promise.all([
    getStudentRepertoire(id),
    getStudentRecentLessons(id),
    getStudentPreferences(id),
    getStudentPracticeHistory(id, 14),
    getStudentPracticeSessions(id, 30),
    getStudentNextLesson(id),
    getStudentSkills(id),
    getSkills(),
    getStudentCompletedLessonCount(id),
    getStudentFeatures(id),
    isAdmin || isTeacher ? getStudentBilling(id, profileId) : null,
    isAdmin || isTeacher ? getStudentParent(id) : null,
    canEditStudent({ profileId, isAdmin, isTeacher }, id),
  ]);

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <StudentDetail
        profile={profile}
        repertoire={repertoire}
        lessons={lessons}
        preferences={preferences}
        practiceHistory={practiceHistory}
        practiceSessions={practiceSessions}
        nextLesson={nextLesson}
        canEdit={isAdmin || isTeacher}
        canEditProfile={canEditProfile}
        lessonsCompleted={lessonsCompleted}
        studentSkills={studentSkills}
        availableSkills={availableSkills}
        enabledFeatures={enabledFeatures}
        billing={billing}
        parent={parent}
      />
    </div>
  );
}
