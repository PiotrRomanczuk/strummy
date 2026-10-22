import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { DemoTour } from '@/components/demo/DemoTour';
import { FamilyPortalBar } from '@/components/dashboard/FamilyPortalBar';
import { dashboardFontVariables } from '@/lib/config/dashboard-fonts';
import { ViewAsBanner } from '@/components/dashboard/view-as/ViewAsBanner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profileId, isAdmin, isTeacher, isStudent, isParent, isDevelopment, viewAs } =
    await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard');
  }

  // Onboarding gate: a user with no role hasn't finished onboarding. The
  // /auth/callback route only enforces this for the OAuth/email-code flow, so
  // password sign-ins would otherwise reach the dashboard role-less. Centralize
  // the gate here so every entry path is covered. Parents carry no admin/
  // teacher/student role, so `isParent` must count as a completed account here
  // or the Family portal would be unreachable.
  if (!isAdmin && !isTeacher && !isStudent && !isParent) {
    redirect('/onboarding');
  }

  const supabase = await createClient();
  // user.id is the auth id, never profiles.id -- that PK is independently
  // minted by handle_new_user (only equal to the auth id by historical
  // coincidence for accounts predating the identity-model rebuild).
  const { data: ownProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single();
  // Previewing a student: the chrome shows the student, not the admin.
  const profile = viewAs ? { id: profileId, full_name: viewAs.fullName } : ownProfile;
  const email = viewAs ? (viewAs.email ?? '') : (user.email ?? '');

  // Parents have one page (the family portal), so they get its single top bar
  // rather than the app rail (Claude Design "Parent view").
  if (isParent && !isAdmin && !isTeacher && !isStudent) {
    return (
      <div
        className={`theme-strummy ${dashboardFontVariables} min-h-screen w-full bg-[var(--ivory)]`}
      >
        <FamilyPortalBar email={email} fullName={profile?.full_name ?? null} />
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div
      className={`theme-strummy ${dashboardFontVariables} flex min-h-screen w-full bg-[var(--ivory)]`}
    >
      <Sidebar
        email={email}
        fullName={profile?.full_name ?? null}
        isAdmin={isAdmin}
        isTeacher={isTeacher}
        isStudent={isStudent}
        isParent={isParent}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {viewAs && <ViewAsBanner studentName={viewAs.fullName ?? viewAs.email ?? '—'} />}
        <Topbar
          profileId={profile?.id ?? null}
          email={email}
          fullName={profile?.full_name ?? null}
          isAdmin={isAdmin}
          isTeacher={isTeacher}
          isStudent={isStudent}
          isParent={isParent}
        />
        <main className="flex-1">{children}</main>
      </div>
      {/* Demo-only guided tour: real accounts never render (or download) it. */}
      {isDevelopment && (isTeacher || isAdmin || isStudent) && (
        <DemoTour role={isStudent ? 'student' : 'teacher'} />
      )}
    </div>
  );
}
