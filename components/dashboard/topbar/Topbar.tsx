import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SidebarMobileSheet, getRoleLabel } from '@/components/dashboard/sidebar';
import { DatabaseStatus } from '@/components/debug/DatabaseStatus';
import { TopbarActions } from './Topbar.Actions';
import { TopbarRoleSwitcher } from './Topbar.RoleSwitcher';
import { TopbarSearch } from './Topbar.Search';

interface TopbarProps {
  /** profiles.id (not the auth id) — keys the unread-notification badge. */
  profileId?: string | null;
  email: string;
  fullName?: string | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent?: boolean;
}

/** Claude Design `TopBar`: 56px paper bar — search pill, week chip, bell, New lesson. */
export async function Topbar({
  profileId = null,
  email,
  fullName,
  isAdmin,
  isTeacher,
  isStudent,
  isParent = false,
}: TopbarProps) {
  // isParent is deliberately excluded from the switcher count: it is a flag,
  // not a role, and never participates in view selection (see resolveActiveView).
  const roleCount = [isAdmin, isTeacher, isStudent].filter(Boolean).length;
  const hasMultipleRoles = roleCount > 1;
  const roles = { isAdmin, isTeacher, isStudent, isParent };
  const tRoles = await getTranslations('Roles');
  const roleLabel = getRoleLabel(roles, tRoles);
  const isStaff = isAdmin || isTeacher;
  // Read at request time on the server — avoids relying on NEXT_PUBLIC_* being
  // inlined into the client bundle (which is stale until a full dev restart).
  const hasLocalDb = !!process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--rule)] bg-[var(--paper)] px-3 md:px-5"
      data-testid="dashboard-topbar"
    >
      <div className="md:hidden">
        <SidebarMobileSheet roles={roles} email={email} fullName={fullName} roleLabel={roleLabel} />
      </div>
      <Link
        prefetch={false}
        href="/dashboard"
        className="font-[family-name:var(--serif)] text-[17px] font-semibold md:hidden"
      >
        Strummy
      </Link>
      {/* Both groups may shrink (`min-w-0`), so the bar is never wider than its
          column. When it was — the admin DB badge on a 320px phone, or beside
          the search on an 834px tablet — the page scrolled sideways, touch
          browsers zoomed it out to fit, and taps near the bottom of the screen
          (the AI chat's Send, the user form's Save) landed on whatever sat
          above them (2026-10-27 nightly, iPhone SE + iPad Pro). */}
      <div className="hidden min-w-0 flex-1 md:flex">
        {!isParent && <TopbarSearch canSearchStudents={isStaff} />}
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-3" data-testid="topbar-actions">
        {isAdmin && (
          <DatabaseStatus variant="inline" hasLocalDb={hasLocalDb} className="min-w-0 shrink" />
        )}
        {hasMultipleRoles && (
          <div data-testid="topbar-role-switcher">
            <TopbarRoleSwitcher isAdmin={isAdmin} isTeacher={isTeacher} isStudent={isStudent} />
          </div>
        )}
        <TopbarActions canCreateLesson={isStaff} profileId={profileId} />
      </div>
    </header>
  );
}
