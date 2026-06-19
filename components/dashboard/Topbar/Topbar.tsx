import Link from 'next/link';
import { SidebarMobileSheet, getRoleLabel } from '@/components/dashboard/Sidebar';
import { DatabaseStatus } from '@/components/debug/DatabaseStatus';
import { TopbarUserMenu } from './Topbar.UserMenu';
import { TopbarRoleSwitcher } from './Topbar.RoleSwitcher';

interface TopbarProps {
  email: string;
  fullName?: string | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

export function Topbar({ email, fullName, isAdmin, isTeacher, isStudent }: TopbarProps) {
  const roleCount = [isAdmin, isTeacher, isStudent].filter(Boolean).length;
  const hasMultipleRoles = roleCount > 1;
  const roles = { isAdmin, isTeacher, isStudent };
  const roleLabel = getRoleLabel(roles);
  // Read at request time on the server — avoids relying on NEXT_PUBLIC_* being
  // inlined into the client bundle (which is stale until a full dev restart).
  const hasLocalDb = !!process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;

  return (
    <header
      className="bg-background sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 md:px-6"
      data-testid="dashboard-topbar"
    >
      <div className="md:hidden">
        <SidebarMobileSheet roles={roles} email={email} fullName={fullName} roleLabel={roleLabel} />
      </div>
      <Link href="/dashboard" className="text-sm font-semibold md:hidden">
        Strummy
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {isAdmin && <DatabaseStatus variant="inline" hasLocalDb={hasLocalDb} />}
        {hasMultipleRoles && (
          <div data-testid="topbar-role-switcher">
            <TopbarRoleSwitcher isAdmin={isAdmin} isTeacher={isTeacher} isStudent={isStudent} />
          </div>
        )}
        <TopbarUserMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
