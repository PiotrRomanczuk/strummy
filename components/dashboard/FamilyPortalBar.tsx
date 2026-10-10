import Link from 'next/link';
import { Bell, LogOut, Music } from 'lucide-react';

import { SidebarUserMenu } from './sidebar/Sidebar.UserMenu';
import { getInitials } from './sidebar/sidebar.helpers';

type Props = { email: string; fullName: string | null };

/**
 * Claude Design family portal header — parents get one page, so instead of the
 * app rail they get a single bar: studio mark, "Family portal", bell, account.
 */
export function FamilyPortalBar({ email, fullName }: Props) {
  const name = fullName?.trim() || email;
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 24px',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--paper)',
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'var(--ink)',
          color: 'var(--gold)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Music size={15} />
      </span>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500 }}>
        Strummy Studio
      </span>
      <span
        className="hidden sm:inline"
        style={{
          fontSize: 11,
          color: 'var(--ink-4)',
          border: '1px solid var(--rule)',
          borderRadius: 999,
          padding: '2px 8px',
        }}
      >
        Family portal
      </span>
      <div style={{ flex: 1 }} />
      <Link
        href="/dashboard/notifications"
        aria-label="Notifications"
        style={{
          color: 'var(--ink-3)',
          display: 'grid',
          placeItems: 'center',
          width: 32,
          height: 32,
        }}
      >
        <Bell size={16} />
      </Link>
      <SidebarUserMenu>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'var(--rule-2)',
              color: 'var(--ink-2)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {getInitials(fullName, email)}
          </span>
          <span className="hidden sm:block" style={{ textAlign: 'left', lineHeight: 1.15 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
              {name}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)' }}>Parent</span>
          </span>
        </button>
      </SidebarUserMenu>
      <a
        href="/auth/signout"
        aria-label="Sign out"
        style={{
          color: 'var(--ink-4)',
          display: 'grid',
          placeItems: 'center',
          width: 28,
          height: 28,
        }}
      >
        <LogOut size={14} />
      </a>
    </header>
  );
}
