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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { usePathname } from 'next/navigation';
import { Sidebar, SidebarMobileSheet, getRoleLabel, type RoleFlags } from './index';

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
  return render(<Sidebar email="sarah@strummy.app" fullName="Sarah Teacher" {...roles} />);
}

function renderMobileSheet(roles: RoleFlags) {
  return render(
    <SidebarMobileSheet
      roles={roles}
      email="sarah@strummy.app"
      fullName="Sarah Teacher"
      roleLabel={getRoleLabel(roles)}
    />
  );
}

beforeEach(() => {
  mockUsePathname.mockReturnValue('/dashboard');
});

describe('Sidebar (desktop)', () => {
  it('renders the core teacher nav items and hides gated ones', () => {
    renderDesktopSidebar(TEACHER);

    // Role label (shown in both the header and the footer) + core-loop items are visible
    expect(screen.getAllByText('Teacher').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lessons' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Songs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assignments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();

    // Gated / stub items stay out of the nav entirely
    expect(screen.queryByRole('link', { name: 'Theory' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Health Monitor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cohorts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Logs' })).not.toBeInTheDocument();
    // The whole Analytics group is empty once its items are gated, so it's dropped
    expect(screen.queryByRole('button', { name: 'Analytics' })).not.toBeInTheDocument();
  });

  it('renders the core student nav items and hides gated ones', () => {
    renderDesktopSidebar(STUDENT);

    expect(screen.getAllByText('Student').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Lessons' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Songs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Assignments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Repertoire' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice Log' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();

    // Teacher-only / stub items are not shown to a student
    expect(screen.queryByRole('link', { name: 'Students' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Stats' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Theory' })).not.toBeInTheDocument();
  });

  it('gives admin the same nav set as teacher (admin oversees teachers)', () => {
    renderDesktopSidebar(ADMIN);

    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Lessons' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Lessons' })).not.toBeInTheDocument();
  });

  it('highlights the nav item matching the current pathname', () => {
    mockUsePathname.mockReturnValue('/dashboard/lessons');
    renderDesktopSidebar(TEACHER);

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

  it('highlights Dashboard only on the exact home route', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    renderDesktopSidebar(TEACHER);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('data-active', 'true');
  });

  it('gives each nav link the correct href', () => {
    renderDesktopSidebar(TEACHER);

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
    renderDesktopSidebar(TEACHER);

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
    renderDesktopSidebar(TEACHER);

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
