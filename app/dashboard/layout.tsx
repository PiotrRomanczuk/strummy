import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { DemoTour } from '@/components/demo/DemoTour';
import { FamilyPortalBar } from '@/components/dashboard/FamilyPortalBar';
import { dashboardFontVariables } from '@/lib/config/dashboard-fonts';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isTeacher, isStudent, isParent, isDevelopment } =
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single();

  // Parents have one page (the family portal), so they get its single top bar
  // rather than the app rail (Claude Design "Parent view").
  if (isParent && !isAdmin && !isTeacher && !isStudent) {
    return (
      <div
        className={`theme-strummy ${dashboardFontVariables} min-h-screen w-full bg-[var(--ivory)]`}
      >
        <FamilyPortalBar email={user.email ?? ''} fullName={profile?.full_name ?? null} />
        <main>{children}</main>
      </div>
    );
  }

  const t = await getTranslations('Nav');

  return (
    <div
      className={`theme-strummy ${dashboardFontVariables} flex min-h-screen w-full bg-[var(--ivory)]`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-[var(--paper)]"
      >
        {t('skipToContent')}
      </a>
      <Sidebar
        email={user.email ?? ''}
        fullName={profile?.full_name ?? null}
        isAdmin={isAdmin}
        isTeacher={isTeacher}
        isStudent={isStudent}
        isParent={isParent}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          profileId={profile?.id ?? null}
          email={user.email ?? ''}
          fullName={profile?.full_name ?? null}
          isAdmin={isAdmin}
          isTeacher={isTeacher}
          isStudent={isStudent}
          isParent={isParent}
        />
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
      {/* Demo-only guided tour: real accounts never render (or download) it. */}
      {isDevelopment && (isTeacher || isAdmin || isStudent) && (
        <DemoTour role={isStudent ? 'student' : 'teacher'} />
      )}
    </div>
  );
}
