/**
 * Component-level render tests for the real dashboard Sidebar.
 *
 * Prior coverage (`sidebar.helpers.test.ts`) only exercises the pure
 * role/query filtering logic. This file renders the actual component tree
 * (`Sidebar` + `SidebarMobileSheet`, which pull in `Sidebar.Body`,
 * `Sidebar.NavGroup`, `Sidebar.NavItem`, and `Sidebar.Search`) to verify the
 * wiring: role-gated nav items, active-path highlighting, link hrefs, live
 * search filtering, and the mobile drawer open/close behavior.
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
    expect(screen.getByRole('link', { name: 'Practice Tools' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();

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
    // NOT-4: the inbox previously had no entry point at all.
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();

    // Teacher-only / stub / flagged-off items are not shown to a student
    expect(screen.queryByRole('link', { name: 'Students' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Stats' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Theory' })).not.toBeInTheDocument();
    // Off at SHOW_PRACTICE_FEATURES; with My Stats also hidden the whole
    // Progress group disappears from the student sidebar.
    expect(screen.queryByRole('link', { name: 'Practice Log' })).not.toBeInTheDocument();
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

    expect(screen.getByRole('link', { name: 'Lessons' })).toHaveAttribute(
      'href',
      '/dashboard/lessons'
    );
    expect(screen.getByRole('link', { name: 'Songs' })).toHaveAttribute('href', '/dashboard/songs');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/dashboard/settings'
    );
  });

  it('filters visible nav items as the user types in search', async () => {
    const user = userEvent.setup();
    await renderDesktopSidebar(TEACHER);

    const search = screen.getByRole('searchbox', { name: 'Filter navigation' });
    await user.type(search, 'song');

    expect(screen.getByRole('link', { name: 'Songs' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Lessons' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    // Groups with no surviving items are dropped entirely
    expect(screen.queryByRole('button', { name: 'Students' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tools' })).not.toBeInTheDocument();
  });

  it('shows an empty state when the search query matches nothing', async () => {
    const user = userEvent.setup();
    await renderDesktopSidebar(TEACHER);

    const search = screen.getByRole('searchbox', { name: 'Filter navigation' });
    await user.type(search, 'zzz-nonexistent');

    expect(screen.getByText(/No matches for/i)).toBeInTheDocument();
    // Scope to the nav landmark — the header logo link ("Strummy") is not
    // part of the filterable nav and stays rendered regardless of query.
    const nav = screen.getByRole('navigation', { name: 'Dashboard navigation' });
    expect(within(nav).queryByRole('link')).not.toBeInTheDocument();
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

  it('does not put focus in the search box when it opens', async () => {
    // Radix focuses a dialog's first focusable element, which here is the
    // search input — on a phone that raises the on-screen keyboard and it
    // covers most of the navigation the user just opened. Regression guard:
    // invisible on a desktop, so only an assertion catches it coming back.
    const user = userEvent.setup();
    renderMobileSheet(TEACHER);

    await user.click(screen.getByTestId('sidebar-mobile-trigger'));
    const drawer = await screen.findByTestId('sidebar-mobile');

    const search = within(drawer).getByTestId('sidebar-search').querySelector('input');
    expect(search).not.toBe(document.activeElement);
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

  it('still lets the user reach the search box deliberately', async () => {
    const user = userEvent.setup();
    renderMobileSheet(TEACHER);

    await user.click(screen.getByTestId('sidebar-mobile-trigger'));
    const drawer = await screen.findByTestId('sidebar-mobile');
    const search = within(drawer).getByTestId('sidebar-search').querySelector('input')!;

    await user.click(search);
    expect(search).toBe(document.activeElement);
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
