/**
 * Render tests for the dashboard Topbar, focused on the role switcher's
 * visibility rule.
 *
 * This lives here rather than in the E2E topbar spec on purpose. The switcher
 * only appears for an account holding two or more roles, and no seeded E2E
 * account does — the suite's admin is admin-only. Granting a second role mid-run
 * to reach that branch mutates a shared account and leaks into sibling tests
 * (Playwright runs a file's tests in parallel), which is exactly how the old
 * E2E assertion came to be wrong. `Topbar` takes plain props, so the rule is
 * cheap and deterministic to pin here.
 *
 * @see components/dashboard/Topbar/Topbar.tsx
 */
import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { resolveServerTree } from '@/lib/testing/resolve-async-server-components';
import { Topbar } from './Topbar';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
  // Topbar.RoleSwitcher reads the active view from the query string.
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

const baseProps = {
  email: 'someone@dev.local',
  fullName: 'Someone Example',
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
};

const switcher = () => screen.queryByTestId('topbar-role-switcher');

describe('Topbar role switcher', () => {
  it.each([
    ['admin only', { isAdmin: true }],
    ['teacher only', { isTeacher: true }],
    ['student only', { isStudent: true }],
  ])('is hidden for a single-role account (%s)', async (_label, roles) => {
    await renderServerTree(<Topbar {...baseProps} {...roles} />);
    expect(switcher()).not.toBeInTheDocument();
  });

  it.each([
    ['admin + teacher', { isAdmin: true, isTeacher: true }],
    ['teacher + student', { isTeacher: true, isStudent: true }],
    ['admin + student', { isAdmin: true, isStudent: true }],
    ['all three', { isAdmin: true, isTeacher: true, isStudent: true }],
  ])('is shown once two or more roles are held (%s)', async (_label, roles) => {
    await renderServerTree(<Topbar {...baseProps} {...roles} />);
    expect(switcher()).toBeInTheDocument();
  });

  it('does not count isParent toward the switcher', async () => {
    // isParent is a flag, not a role, and never participates in view selection
    // (see resolveActiveView) — so a parent who is also a student stays single.
    await renderServerTree(<Topbar {...baseProps} isStudent isParent />);
    expect(switcher()).not.toBeInTheDocument();
  });

  it('renders no switcher for an account with no role at all', async () => {
    await renderServerTree(<Topbar {...baseProps} />);
    expect(switcher()).not.toBeInTheDocument();
  });

  it('always renders the user menu regardless of role count', async () => {
    const { rerender } = await renderServerTree(<Topbar {...baseProps} isStudent />);
    expect(screen.getByTestId('topbar-user-menu-trigger')).toBeInTheDocument();

    rerender(await resolveServerTree(<Topbar {...baseProps} isAdmin isTeacher />));
    expect(screen.getByTestId('topbar-user-menu-trigger')).toBeInTheDocument();
  });
});
