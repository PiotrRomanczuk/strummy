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

const mockSearch = jest.fn();
jest.mock('@/app/actions/topbar-search', () => ({
  searchTopbar: (...args: unknown[]) => mockSearch(...args),
}));

const mockPush = jest.fn();
const mockUnread = jest.fn<Promise<number>, [string]>(async () => 0);

jest.mock('@/lib/services/in-app-notification-service', () => ({
  getUnreadCount: (id: string) => mockUnread(id),
}));

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
  beforeEach(() => {
    mockPush.mockClear();
    mockSearch.mockReset();
    mockSearch.mockResolvedValue({ songs: [], students: [] });
  });

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

    const search = screen.getByRole('combobox', { name: 'Search students, songs, lessons…' });
    await user.type(search, 'wonder');
    expect(screen.getByRole('button', { name: 'Songs matching “wonder”' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Students matching “wonder”' })).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/dashboard/songs?search=wonder');
  });

  it('shows live results and opens one directly', async () => {
    mockSearch.mockResolvedValue({
      songs: [{ id: 's1', title: 'Wonderwall', author: 'Oasis' }],
      students: [{ id: 'p1', name: 'Ania Wonder' }],
    });
    const user = userEvent.setup();
    await renderServerTree(<Topbar {...baseProps} isTeacher />);

    await user.type(screen.getByRole('combobox'), 'wonder');
    expect(await screen.findByRole('button', { name: /Wonderwall/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ania Wonder' })).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/dashboard/songs/s1');
  });

  it('moves through results with the arrow keys', async () => {
    mockSearch.mockResolvedValue({
      songs: [{ id: 's1', title: 'Wonderwall', author: 'Oasis' }],
      students: [{ id: 'p1', name: 'Ania Wonder' }],
    });
    const user = userEvent.setup();
    await renderServerTree(<Topbar {...baseProps} isTeacher />);

    await user.type(screen.getByRole('combobox'), 'wonder');
    await screen.findByRole('button', { name: /Wonderwall/ });
    await user.keyboard('{ArrowDown}{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/dashboard/users/p1');
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    await renderServerTree(<Topbar {...baseProps} isTeacher />);

    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(await screen.findByText('No results')).toBeInTheDocument();
  });

  it('does not offer a students target to a student', async () => {
    const user = userEvent.setup();
    await renderServerTree(<Topbar {...baseProps} isStudent />);

    await user.type(screen.getByRole('combobox'), 'wonder');
    expect(screen.getByRole('button', { name: 'Songs matching “wonder”' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Students matching/ })).not.toBeInTheDocument();
  });
});

// jsdom has no layout, so these pin the classes the layout depends on. Without
// them the admin's DB badge made the bar wider than a 320px phone (and than the
// tablet column beside the sidebar); touch browsers then zoomed the page out
// and taps near the bottom of the screen missed — the AI chat's Send and the
// user form's Save were unclickable (2026-10-27 nightly, iPhone SE + iPad Pro).
describe('Topbar width', () => {
  it('lets both groups shrink so the bar never outgrows its column', async () => {
    await renderServerTree(<Topbar {...baseProps} isAdmin />);
    expect(screen.getByTestId('topbar-actions')).toHaveClass('min-w-0');
    expect(screen.getByTestId('topbar-search')).toHaveClass('min-w-0');
    expect(screen.getByTestId('topbar-search').parentElement).toHaveClass('min-w-0');
  });

  it("does not let the search input's intrinsic width set the bar's minimum", async () => {
    await renderServerTree(<Topbar {...baseProps} isTeacher />);
    expect(screen.getByRole('combobox')).toHaveClass('w-0', 'min-w-0', 'flex-1');
  });

  it('hides the DB badge when there is no second stack to switch to', async () => {
    await renderServerTree(<Topbar {...baseProps} isAdmin />);
    expect(screen.queryByText(/Checking\.\.\.|Local DB|Remote DB/)).not.toBeInTheDocument();
  });

  it('lets the admin DB badge shrink instead of pushing the bar wider', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL = 'http://192.168.1.75:55321';
    await renderServerTree(<Topbar {...baseProps} isAdmin />);
    delete process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;
    const badge = screen.getByText(/Checking\.\.\.|Local DB|Remote DB/).closest('[data-slot]');
    expect(badge).toHaveClass('min-w-0', 'shrink');
    expect(badge).not.toHaveClass('shrink-0');
  });
});

describe('Topbar notifications badge', () => {
  it('shows the unread count for the signed-in profile', async () => {
    mockUnread.mockResolvedValueOnce(3);
    await renderServerTree(<Topbar {...baseProps} isTeacher profileId="p-1" />);
    expect(mockUnread).toHaveBeenCalledWith('p-1');
    expect(screen.getByTestId('topbar-bell-badge')).toHaveTextContent('3');
    expect(screen.getByTestId('topbar-bell')).toHaveAccessibleName('Notifications (3 unread)');
  });

  it('caps the badge at 9+', async () => {
    mockUnread.mockResolvedValueOnce(14);
    await renderServerTree(<Topbar {...baseProps} isTeacher profileId="p-1" />);
    expect(screen.getByTestId('topbar-bell-badge')).toHaveTextContent('9+');
  });

  it('renders no badge when nothing is unread or there is no profile', async () => {
    await renderServerTree(<Topbar {...baseProps} isTeacher profileId="p-1" />);
    expect(screen.queryByTestId('topbar-bell-badge')).not.toBeInTheDocument();
    mockUnread.mockClear();
    await renderServerTree(<Topbar {...baseProps} isTeacher />);
    expect(mockUnread).not.toHaveBeenCalled();
  });
});
