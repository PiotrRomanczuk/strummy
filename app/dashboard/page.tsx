import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import { AdminDashboard } from '@/components/dashboard/admin/AdminDashboard';
import { ParentView } from '@/components/dashboard/parent';
import { StudentDashboard } from '@/components/dashboard/student/StudentDashboard';
import { TeacherDashboard } from '@/components/dashboard/teacher/TeacherDashboard';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getPendingInvites, getPlatformPulse } from '@/lib/services/admin-dashboard-queries';
import { getLockedAccounts } from '@/app/actions/admin/lockout';
import {
  getStudentNextLesson,
  getStudentOpenAssignments,
  getStudentTopSongs,
} from '@/lib/services/student-dashboard-queries';
import {
  calcUtilization,
  getAtRiskStudents,
  getOverdueAssignments,
  getTeacherRoster,
  getWeekDensity,
} from '@/lib/services/teacher-dashboard-backfill-queries';
import { getStudioActivity } from '@/lib/services/teacher-dashboard-activity';
import {
  getTeacherDayLessons,
  summariseDayLessons,
} from '@/lib/services/teacher-dashboard-queries';
import { getCurrentSongOfTheWeek } from '@/app/actions/song-of-the-week';
import type { SongOfWeekView } from '@/components/dashboard/teacher/TeacherDeltaCards';

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

function resolveActiveView(
  view: string | undefined,
  isAdmin: boolean,
  isTeacher: boolean,
  isStudent: boolean,
  isParent: boolean
): 'admin' | 'teacher' | 'student' | 'parent' {
  if (view === 'admin' && isAdmin) return 'admin';
  if (view === 'student' && isStudent) return 'student';
  if (view === 'teacher' && isTeacher) return 'teacher';
  if (view === 'parent' && isParent) return 'parent';
  if (isTeacher) return 'teacher';
  if (isStudent) return 'student';
  if (isParent) return 'parent';
  if (isAdmin) return 'admin';
  return 'teacher';
}

async function loadProfileName(userId: string): Promise<string | null> {
  const supabase = await createClient();
  // userId here is the auth id (auth.uid()), never profiles.id -- that PK is
  // independently minted by handle_new_user and only equals the auth id by
  // historical coincidence for accounts predating the identity-model rebuild.
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', userId)
    .single();
  return (data?.full_name as string | null) ?? null;
}

function toSongOfWeekView(
  sotw: Awaited<ReturnType<typeof getCurrentSongOfTheWeek>>
): SongOfWeekView | null {
  if (!sotw) return null;
  return {
    id: sotw.song.id,
    title: sotw.song.title,
    author: sotw.song.author ?? null,
    level: sotw.song.level ?? null,
    songKey: sotw.song.key ?? null,
    capoFret: sotw.song.capo_fret ?? null,
    tempo: sotw.song.tempo ?? null,
    teacherMessage: sotw.teacher_message ?? null,
  };
}

// `userId` is the auth id and `profileId` is profiles.id -- they are different
// values since the identity-model rebuild. Only loadProfileName matches on
// user_id; every query below filters lessons.teacher_id / assignments.teacher_id,
// which live in profile-id space. Passing the auth id to those matched zero rows
// and rendered a completely empty dashboard (no schedule, no roster, 0%
// utilization) for a teacher who in fact had a full book of lessons.
async function TeacherView({
  userId,
  profileId,
  email,
}: {
  userId: string;
  profileId: string;
  email: string;
}) {
  const now = new Date();
  const [fullName, lessons, atRisk, overdueAssignments, weekDensity, roster, activity, sotw] =
    await Promise.all([
      loadProfileName(userId),
      getTeacherDayLessons(profileId, now),
      getAtRiskStudents(profileId, now),
      getOverdueAssignments(profileId, now),
      getWeekDensity(profileId, now),
      getTeacherRoster(profileId),
      getStudioActivity(profileId, now),
      getCurrentSongOfTheWeek(),
    ]);
  const stats = summariseDayLessons(lessons);
  const utilization = calcUtilization(weekDensity);
  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <TeacherDashboard
        fullName={fullName}
        email={email}
        now={now}
        lessons={lessons}
        stats={stats}
        atRisk={atRisk}
        overdueAssignments={overdueAssignments}
        weekDensity={weekDensity}
        utilization={utilization}
        roster={roster}
        activity={activity}
        songOfWeek={toSongOfWeekView(sotw)}
      />
    </div>
  );
}

async function AdminView() {
  const now = new Date();
  const [pulse, invites, lockedAccountsResult] = await Promise.all([
    getPlatformPulse(),
    getPendingInvites(),
    getLockedAccounts(),
  ]);
  const lockedAccounts = lockedAccountsResult.success ? (lockedAccountsResult.accounts ?? []) : [];
  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <AdminDashboard pulse={pulse} invites={invites} lockedAccounts={lockedAccounts} now={now} />
    </div>
  );
}

// Same split as TeacherView: lessons.student_id, student_repertoire.student_id
// and assignments.student_id are all profile ids, so a student passed their own
// auth id saw no next lesson, no songs and no assignments.
async function StudentView({
  userId,
  profileId,
  email,
}: {
  userId: string;
  profileId: string;
  email: string;
}) {
  const now = new Date();
  const [fullName, nextLesson, songs, openAssignments] = await Promise.all([
    loadProfileName(userId),
    getStudentNextLesson(profileId),
    getStudentTopSongs(profileId),
    getStudentOpenAssignments(profileId),
  ]);
  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <StudentDashboard
        fullName={fullName}
        email={email}
        now={now}
        nextLesson={nextLesson}
        songs={songs}
        openAssignments={openAssignments}
      />
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { view, child } = await searchParams;
  const { user, profileId, isAdmin, isTeacher, isStudent, isParent } = await getUserWithRolesSSR();
  const activeView = resolveActiveView(
    typeof view === 'string' ? view : undefined,
    isAdmin,
    isTeacher,
    isStudent,
    isParent
  );

  if (activeView === 'teacher' && user) {
    return <TeacherView userId={user.id} profileId={profileId} email={user.email ?? ''} />;
  }

  if (activeView === 'student' && user) {
    return <StudentView userId={user.id} profileId={profileId} email={user.email ?? ''} />;
  }

  if (activeView === 'parent' && user) {
    return (
      <ParentView
        profileId={profileId}
        childParam={typeof child === 'string' ? child : undefined}
      />
    );
  }

  if (activeView === 'admin' && user) {
    return <AdminView />;
  }

  redirect('/sign-in?redirect=/dashboard');
}
