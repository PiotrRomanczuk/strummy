'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SidebarUserMenu } from './Sidebar.UserMenu';
import { getInitials } from './sidebar.helpers';

interface SidebarFooterProps {
  email: string;
  fullName?: string | null;
  roleLabel: string;
}

/** Claude Design rail footer: ink avatar, name, role, sign-out glyph. */
export function SidebarFooter({ email, fullName, roleLabel }: SidebarFooterProps) {
  const t = useTranslations('Sidebar');
  const displayName = fullName?.trim() || email;

  return (
    <div className="mt-auto flex items-center gap-2.5 border-t border-[var(--rule)] pt-2.5">
      <SidebarUserMenu>
        <button
          type="button"
          data-testid="sidebar-user-menu-trigger"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left transition-opacity hover:opacity-80"
        >
          <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-[var(--ink-2)] text-xs font-medium text-[var(--paper)]">
            {getInitials(fullName, email)}
          </span>
          <span className="min-w-0 flex-1 leading-[1.15]">
            <span className="block truncate text-[13px] font-medium">{displayName}</span>
            <span className="block truncate text-[11px] text-[var(--ink-4)]">{roleLabel}</span>
          </span>
        </button>
      </SidebarUserMenu>
      {/* A real navigation, not a click handler: the session is a server
          cookie, so signing out has to happen server-side (see the route). */}
      <a
        href="/auth/signout"
        aria-label={t('signOut')}
        data-testid="sidebar-signout"
        className="grid size-7 place-items-center rounded-md text-[var(--ink-4)] transition-colors hover:text-[var(--danger)]"
      >
        <LogOut className="size-3.5" strokeWidth={1.6} />
      </a>
    </div>
  );
}
