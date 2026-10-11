import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SidebarMobileSheet, getRoleLabel } from '@/components/dashboard/sidebar';
import { DatabaseStatus } from '@/components/debug/DatabaseStatus';
import { TopbarActions } from './Topbar.Actions';
import { TopbarRoleSwitcher } from './Topbar.RoleSwitcher';
import { TopbarSearch } from './Topbar.Search';

interface TopbarProps {
  email: string;
  fullName?: string | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent?: boolean;
}

/** Claude Design `TopBar`: 56px paper bar — search pill, week chip, bell, New lesson. */
export async function Topbar({
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
        href="/dashboard"
        className="font-[family-name:var(--serif)] text-[17px] font-semibold md:hidden"
      >
        Strummy
      </Link>
      <div className="hidden flex-1 md:flex">
        {!isParent && <TopbarSearch canSearchStudents={isStaff} />}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {isAdmin && <DatabaseStatus variant="inline" hasLocalDb={hasLocalDb} />}
        {hasMultipleRoles && (
          <div data-testid="topbar-role-switcher">
            <TopbarRoleSwitcher isAdmin={isAdmin} isTeacher={isTeacher} isStudent={isStudent} />
          </div>
        )}
        <TopbarActions canCreateLesson={isStaff} />
      </div>
    </header>
  );
}
