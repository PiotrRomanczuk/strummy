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
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { resolveServerTree } from '@/lib/testing/resolve-async-server-components';
import { Topbar } from './Topbar';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({ push: mockPush, refresh: jest.fn() })),
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

  it('always renders the notifications bell regardless of role count', async () => {
    const { rerender } = await renderServerTree(<Topbar {...baseProps} isStudent />);
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute(
      'href',
      '/dashboard/notifications'
    );

    rerender(await resolveServerTree(<Topbar {...baseProps} isAdmin isTeacher />));
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
  });
});

// The account menu (name, settings, language, theme) moved to the sidebar
// footer in the Claude Design shell; the top bar now carries search, the week
// chip, the bell and the "New lesson" CTA.
describe('Topbar actions', () => {
  beforeEach(() => mockPush.mockClear());

  it('shows the "New lesson" CTA to staff only', async () => {
    const { rerender } = await renderServerTree(<Topbar {...baseProps} isTeacher />);
    expect(screen.getByRole('link', { name: 'New lesson' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/new'
    );

    rerender(await resolveServerTree(<Topbar {...baseProps} isStudent />));
    expect(screen.queryByRole('link', { name: 'New lesson' })).not.toBeInTheDocument();
  });

  it('shows the ISO week chip', async () => {
    await renderServerTree(<Topbar {...baseProps} isTeacher />);
    expect(screen.getByTestId('topbar-week')).toHaveTextContent(/^Week \d+$/);
  });

  it('hides the search pill for a parent-only account', async () => {
    await renderServerTree(<Topbar {...baseProps} isParent />);
    expect(screen.queryByTestId('topbar-search')).not.toBeInTheDocument();
  });

  it('offers a students target to staff and jumps to songs on Enter', async () => {
    const user = userEvent.setup();
    await renderServerTree(<Topbar {...baseProps} isTeacher />);

    const search = screen.getByRole('searchbox', { name: 'Search students, songs, lessons…' });
    await user.type(search, 'wonder');
    expect(screen.getByRole('button', { name: 'Songs matching “wonder”' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Students matching “wonder”' })).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/dashboard/songs?search=wonder');
  });

  it('does not offer a students target to a student', async () => {
    const user = userEvent.setup();
    await renderServerTree(<Topbar {...baseProps} isStudent />);

    await user.type(screen.getByRole('searchbox'), 'wonder');
    expect(screen.getByRole('button', { name: 'Songs matching “wonder”' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Students matching/ })).not.toBeInTheDocument();
  });
});
