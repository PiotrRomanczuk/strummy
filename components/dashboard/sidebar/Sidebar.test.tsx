/**
 * Component-level render tests for the real dashboard Sidebar.
 *
 * Prior coverage (`sidebar.helpers.test.ts`) only exercises the pure
 * role/query filtering logic. This file renders the actual component tree
 * (`Sidebar` + `SidebarMobileSheet`, which pull in `Sidebar.Body`,
 * `Sidebar.NavGroup`, `Sidebar.NavItem`, and `Sidebar.Footer`) to verify the
 * wiring: role-gated nav items, active-path highlighting, link hrefs, the
 * footer identity + sign-out, and the mobile drawer open/close behavior.
 * Search moved to the top bar (Claude Design `SidebarNav`), so the rail has no
 * filter box of its own.
 *
 * @see components/dashboard/Sidebar/Sidebar.tsx
 * @see components/dashboard/Sidebar/Sidebar.MobileSheet.tsx
 * @see docs/app-blueprint/93-design-mockup-audit.md (Sidebars.html row)
 */
import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { usePathname } from 'next/navigation';
import enMessages from '@/messages/en.json';
import { renderWithIntl, renderServerTree } from '@/lib/testing/intl-test-utils';
import { Sidebar, SidebarMobileSheet, getRoleLabel, type RoleFlags } from './index';

const tRoles = (key: string) => enMessages.Roles[key as keyof typeof enMessages.Roles];

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
}));

const mockUsePathname = usePathname as jest.Mock;

const TEACHER: RoleFlags = { isAdmin: false, isTeacher: true, isStudent: false };
const STUDENT: RoleFlags = { isAdmin: false, isTeacher: false, isStudent: true };
const ADMIN: RoleFlags = { isAdmin: true, isTeacher: false, isStudent: false };

function renderDesktopSidebar(roles: RoleFlags) {
  return renderServerTree(
    <Sidebar email="sarah@strummy.app" fullName="Sarah Teacher" {...roles} />
  );
}

function renderMobileSheet(roles: RoleFlags) {
  return renderWithIntl(
    <SidebarMobileSheet
      roles={roles}
      email="sarah@strummy.app"
      fullName="Sarah Teacher"
      roleLabel={getRoleLabel(roles, tRoles)}
    />
  );
}

beforeEach(() => {
  mockUsePathname.mockReturnValue('/dashboard');
});

describe('Sidebar (desktop)', () => {
  it('renders the core teacher nav items and hides gated ones', async () => {
    await renderDesktopSidebar(TEACHER);

    // Role label (shown in both the header and the footer) + core-loop items are visible
    expect(screen.getAllByText('Teacher').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lessons' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Songs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assignments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument();
    // Tools = Calendar, Fretboard, AI Assistant (Claude Design `SidebarNav`)
    expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fretboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AI Assistant' })).toBeInTheDocument();
    // Settings lives in the footer account menu, Notifications on the top-bar bell
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();

    // Gated / stub items stay out of the nav entirely
    expect(screen.queryByRole('link', { name: 'Theory' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Health Monitor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cohorts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Logs' })).not.toBeInTheDocument();
    // The whole Analytics group is empty once its items are gated, so it's dropped
    expect(screen.queryByRole('button', { name: 'Analytics' })).not.toBeInTheDocument();
  });

  it('renders the core student nav items and hides gated ones', async () => {
    await renderDesktopSidebar(STUDENT);

    expect(screen.getAllByText('Student').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Lessons' })).toBeInTheDocument();
    // "Song Library", not "My Songs": the route lists the whole studio library,
    // the student's own songs live under "My Repertoire" (SNG-6).
    expect(screen.getByRole('link', { name: 'Song Library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Assignments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Repertoire' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice Tools' })).toBeInTheDocument();

    // Teacher-only / stub / flagged-off items are not shown to a student
    expect(screen.queryByRole('link', { name: 'Students' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Stats' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Theory' })).not.toBeInTheDocument();

    // On at SHOW_PRACTICE_FEATURES since 2026-08-19, and the only surviving
    // member of the Progress group now that My Stats is hidden.
    expect(screen.getByRole('link', { name: 'Practice Log' })).toBeInTheDocument();
  });

  it('gives admin the same nav set as teacher (admin oversees teachers)', async () => {
    await renderDesktopSidebar(ADMIN);

    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Lessons' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Lessons' })).not.toBeInTheDocument();
  });

  it('highlights the nav item matching the current pathname', async () => {
    mockUsePathname.mockReturnValue('/dashboard/lessons');
    await renderDesktopSidebar(TEACHER);

    const lessonsLink = screen.getByRole('link', { name: 'Lessons' });
    expect(lessonsLink).toHaveAttribute('data-active', 'true');
    expect(lessonsLink).toHaveAttribute('aria-current', 'page');

    const songsLink = screen.getByRole('link', { name: 'Songs' });
    expect(songsLink).toHaveAttribute('data-active', 'false');
    expect(songsLink).not.toHaveAttribute('aria-current');

    // Home only highlights on an exact match, not every dashboard sub-route
    const homeLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(homeLink).toHaveAttribute('data-active', 'false');
  });

  it('highlights Dashboard only on the exact home route', async () => {
    mockUsePathname.mockReturnValue('/dashboard');
    await renderDesktopSidebar(TEACHER);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('data-active', 'true');
  });

  it('gives each nav link the correct href', async () => {
    await renderDesktopSidebar(TEACHER);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Lessons' })).toHaveAttribute(
      'href',
      '/dashboard/lessons'
    );
    expect(screen.getByRole('link', { name: 'Songs' })).toHaveAttribute('href', '/dashboard/songs');
    expect(screen.getByRole('link', { name: 'Students' })).toHaveAttribute(
      'href',
      '/dashboard/users'
    );
  });

  it('opens the first group with Dashboard', async () => {
    await renderDesktopSidebar(TEACHER);

    const nav = screen.getByRole('navigation', { name: 'Dashboard navigation' });
    const links = within(nav).getAllByRole('link');
    expect(links[0]).toHaveAccessibleName('Dashboard');
    expect(links[1]).toHaveAccessibleName('Lessons');
  });

  it('shows the user identity and a server-side sign-out link in the footer', async () => {
    await renderDesktopSidebar(TEACHER);

    expect(screen.getByText('Sarah Teacher')).toBeInTheDocument();
    expect(screen.getByText('ST')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign out' })).toHaveAttribute('href', '/auth/signout');
  });

  it('truncates a very long display name so it cannot push sign-out off the rail', async () => {
    // Moved here from the Topbar test with the account menu itself. jsdom
    // computes no layout, so the Tailwind class is what pins the fix.
    const longName = `Emma Wright${' Test'.repeat(22)}`;
    await renderServerTree(<Sidebar email="e@x.dev" fullName={longName} {...STUDENT} />);
    expect(screen.getByText(longName).className).toContain('truncate');
  });

  it('has no search box of its own (search lives in the top bar)', async () => {
    await renderDesktopSidebar(TEACHER);

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});

describe('SidebarMobileSheet', () => {
  it('is closed by default and shows a trigger button', () => {
    renderMobileSheet(TEACHER);

    expect(screen.getByTestId('sidebar-mobile-trigger')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-mobile')).not.toBeInTheDocument();
  });

  it('opens the drawer with nav items on trigger click', async () => {
    const user = userEvent.setup();
    renderMobileSheet(TEACHER);

    await user.click(screen.getByTestId('sidebar-mobile-trigger'));

    const drawer = await screen.findByTestId('sidebar-mobile');
    expect(within(drawer).getByRole('link', { name: 'Lessons' })).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Songs' })).toBeInTheDocument();
  });

  it('focuses the panel itself, not the first nav link, when it opens', async () => {
    // Radix focuses a dialog's first focusable element by default. The sheet
    // overrides that and focuses the content container instead.
    const user = userEvent.setup();
    renderMobileSheet(TEACHER);

    await user.click(screen.getByTestId('sidebar-mobile-trigger'));
    const drawer = await screen.findByTestId('sidebar-mobile');

    await waitFor(() => expect(document.activeElement).toBe(drawer));
  });

  it('still moves focus into the drawer, so the focus trap and Escape work', async () => {
    // Dropping focus entirely would leave it on the trigger behind the overlay:
    // screen readers would not announce the panel, and Tab would walk the page
    // underneath.
    const user = userEvent.setup();
    renderMobileSheet(TEACHER);

    await user.click(screen.getByTestId('sidebar-mobile-trigger'));
    const drawer = await screen.findByTestId('sidebar-mobile');

    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true));
  });

  it('closes the drawer after navigating to a link inside it', async () => {
    const user = userEvent.setup();
    renderMobileSheet(TEACHER);

    await user.click(screen.getByTestId('sidebar-mobile-trigger'));
    const drawer = await screen.findByTestId('sidebar-mobile');

    await user.click(within(drawer).getByRole('link', { name: 'Lessons' }));

    await waitFor(() => {
      expect(screen.queryByTestId('sidebar-mobile')).not.toBeInTheDocument();
    });
  });
});
