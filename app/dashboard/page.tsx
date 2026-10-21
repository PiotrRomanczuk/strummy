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
import { getRecentAudit } from '@/lib/services/admin-audit-queries';
import { getAdminPlatform } from '@/lib/services/admin-platform-queries';
import { loadStudentHome } from '@/components/dashboard/student/student-home.data';
import {
  calcUtilization,
  getAtRiskStudents,
  getOverdueAssignments,
  getWeekDensity,
} from '@/lib/services/teacher-dashboard-backfill-queries';
import { getStudentsToInvite } from '@/lib/services/teacher-invite-queries';
import {
  getLibraryQuickAssign,
  getStudioRoster,
  getWeekComparison,
} from '@/lib/services/teacher-dashboard-studio-queries';
import {
  getTeacherDayLessons,
  summariseDayLessons,
} from '@/lib/services/teacher-dashboard-queries';

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

async function loadProfileName(profileId: string): Promise<string | null> {
  const supabase = await createClient();
  // By profiles.id, never the auth id: an admin previewing a student must be
  // greeted with the student's name, and profileId is the student's then.
  const { data } = await supabase.from('profiles').select('full_name').eq('id', profileId).single();
  return (data?.full_name as string | null) ?? null;
}

// `profileId` is profiles.id, never the auth id -- they are different values
// since the identity-model rebuild. Every query below filters lessons.teacher_id / assignments.teacher_id,
// which live in profile-id space. Passing the auth id to those matched zero rows
// and rendered a completely empty dashboard (no schedule, no roster, 0%
// utilization) for a teacher who in fact had a full book of lessons.
async function TeacherView({ profileId, email }: { profileId: string; email: string }) {
  const now = new Date();
  const [
    fullName,
    lessons,
    atRisk,
    overdueAssignments,
    weekDensity,
    roster,
    compare,
    library,
    toInvite,
  ] = await Promise.all([
    loadProfileName(profileId),
    getTeacherDayLessons(profileId, now),
    getAtRiskStudents(profileId, now),
    getOverdueAssignments(profileId, now),
    getWeekDensity(profileId, now),
    getStudioRoster(profileId, now),
    getWeekComparison(profileId, now),
    getLibraryQuickAssign(profileId),
    getStudentsToInvite(profileId, now),
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
        toInvite={toInvite}
        weekDensity={weekDensity}
        utilization={utilization}
        roster={roster}
        compare={compare}
        library={library}
      />
    </div>
  );
}

async function AdminView() {
  const now = new Date();
  const [pulse, invites, lockedAccountsResult, platform, audit] = await Promise.all([
    getPlatformPulse(),
    getPendingInvites(),
    getLockedAccounts(),
    getAdminPlatform(now),
    getRecentAudit(),
  ]);
  const lockedAccounts = lockedAccountsResult.success ? (lockedAccountsResult.accounts ?? []) : [];
  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <AdminDashboard
        pulse={pulse}
        platform={platform}
        audit={audit}
        invites={invites}
        lockedAccounts={lockedAccounts}
        now={now}
      />
    </div>
  );
}

// Same split as TeacherView: lessons.student_id, student_repertoire.student_id
// and assignments.student_id are all profile ids, so a student passed their own
// auth id saw no next lesson, no songs and no assignments.
async function StudentView({ profileId, email }: { profileId: string; email: string }) {
  const now = new Date();
  const [fullName, home] = await Promise.all([
    loadProfileName(profileId),
    loadStudentHome(profileId, now),
  ]);
  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <StudentDashboard home={home} now={now} fullName={fullName} email={email} />
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { view, child } = await searchParams;
  const { user, profileId, isAdmin, isTeacher, isStudent, isParent, viewAs } =
    await getUserWithRolesSSR();
  const email = viewAs ? (viewAs.email ?? '') : (user?.email ?? '');
  const activeView = resolveActiveView(
    typeof view === 'string' ? view : undefined,
    isAdmin,
    isTeacher,
    isStudent,
    isParent
  );

  if (activeView === 'teacher' && user) {
    return <TeacherView profileId={profileId} email={email} />;
  }

  if (activeView === 'student' && user) {
    return <StudentView profileId={profileId} email={email} />;
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
