import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SidebarBody } from './Sidebar.Body';
import { SidebarFooter } from './Sidebar.Footer';
import { SidebarBrandTile } from './Sidebar.BrandTile';
import { getRoleLabel, type RoleFlags } from './sidebar.helpers';

export interface SidebarProps extends RoleFlags {
  email: string;
  fullName?: string | null;
}

/**
 * Desktop dashboard sidebar — the Claude Design `SidebarNav` (232px paper rail,
 * gold brand tile, uppercase group labels, gold active bar).
 * Hidden below the `md` breakpoint — pair with `<SidebarMobileSheet>` for mobile.
 */
export async function Sidebar({ email, fullName, ...roles }: SidebarProps) {
  const [tRoles, tSidebar] = await Promise.all([
    getTranslations('Roles'),
    getTranslations('Sidebar'),
  ]);
  const roleLabel = getRoleLabel(roles, tRoles);

  return (
    <aside
      data-testid="dashboard-sidebar"
      aria-label={tSidebar('navAriaLabel')}
      className="hidden border-r border-[var(--rule)] bg-[var(--paper)] px-3 py-4 text-[13px] md:sticky md:top-0 md:flex md:h-screen md:w-[232px] md:shrink-0 md:flex-col md:gap-1"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 rounded-lg px-2 pt-1.5 pb-3 transition-opacity hover:opacity-80"
      >
        <SidebarBrandTile />
        <div className="min-w-0 leading-[1.1]">
          <p className="truncate font-[family-name:var(--serif)] text-[17px] font-semibold tracking-[-0.01em]">
            Strummy
          </p>
          <p className="truncate text-[11px] tracking-[0.1em] text-[var(--ink-4)] uppercase">
            {roleLabel}
          </p>
        </div>
      </Link>
      <SidebarBody roles={roles} />
      <SidebarFooter email={email} fullName={fullName} roleLabel={roleLabel} />
    </aside>
  );
}
