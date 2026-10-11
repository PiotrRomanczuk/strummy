/**
 * Shell-level render coverage for the Claude Design AdminDashboard — "is the
 * platform healthy, and who's stuck?": greeting verdict, platform pulse,
 * trending churn, cohort health, live services, audit log, pending invites,
 * locked accounts and the Strummy AI strip.
 *
 * jsdom applies no media queries, so the phone composition (AdminMobileTop)
 * renders alongside the desktop one; desktop assertions are scoped where a
 * label legitimately appears in both.
 *
 * @see components/dashboard/admin/AdminDashboard.tsx
 * @see components/dashboard/admin/LockedAccountsCard.tsx
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import type { AdminPendingInvite, PlatformPulse } from '@/lib/services/admin-dashboard-queries';
import type { AdminPlatform } from '@/lib/services/admin-platform-queries';
import type { AuditEntry } from '@/lib/services/admin-audit-queries';
import type { LockedAccount } from '@/app/actions/admin/lockout';

const mockUnlockAccount = jest.fn();
jest.mock('@/app/actions/admin/lockout', () => ({
  unlockAccount: (...args: unknown[]) => mockUnlockAccount(...args),
}));

import { AdminDashboard } from './AdminDashboard';

// Local time components (not a 'Z' ISO literal) so the relative-timestamp
// math behaves the same regardless of the machine/CI timezone running the
// suite.
const NOW = new Date(2026, 6, 20, 10, 0, 0);

const PULSE: PlatformPulse = {
  totalUsers: 128,
  totalStudents: 100,
  totalTeachers: 20,
  totalSongs: 340,
  totalLessons: 512,
};

const PLATFORM: AdminPlatform = {
  pulse: {
    active30: 64,
    active30Prev: 50,
    lessonsWeek: 30,
    lessonsWeekPrev: 40,
    newSignups7d: 3,
    retention28: 82,
  },
  atRisk: [
    {
      id: 'student-liam',
      name: 'Liam Fox',
      email: 'liam@example.com',
      color: null,
      teacher: 'Sarah Connor',
      daysQuiet: 24,
    },
  ],
  cohorts: [
    { key: 'new', count: 10, healthy: 6, atRisk: 3, dormant: 1 },
    { key: 'active', count: 50, healthy: 40, atRisk: 5, dormant: 5 },
    { key: 'long', count: 40, healthy: 30, atRisk: 2, dormant: 8 },
  ],
  studentCount: 100,
  atRiskCount: 7,
};

const AUDIT: AuditEntry[] = [
  {
    id: 'audit-1',
    at: new Date(2026, 6, 20, 9, 15, 0).toISOString(),
    role: 'teacher',
    who: 'sarah@example.com',
    verb: 'created',
    object: 'Lesson #12',
  },
  {
    id: 'audit-2',
    at: new Date(2026, 6, 18, 10, 0, 0).toISOString(),
    role: 'admin',
    who: 'admin@example.com',
    verb: 'changed the role of',
    object: 'Noah Bell',
  },
];

const INVITES: AdminPendingInvite[] = [
  {
    id: 'invite-1',
    email: 'new.teacher@example.com',
    createdAt: new Date(2026, 6, 20, 8, 0, 0).toISOString(), // < 1 day ago
  },
  {
    id: 'invite-2',
    email: 'pending.student@example.com',
    createdAt: new Date(2026, 5, 1).toISOString(), // well over 14 days ago
  },
];

const LOCKED_ACCOUNTS: LockedAccount[] = [
  {
    id: 'user-9',
    email: 'locked.user@example.com',
    fullName: 'Marta Kowalska',
    failedLoginAttempts: 5,
    lockedUntil: new Date(2026, 6, 21, 12, 0, 0).toISOString(),
  },
];

const baseProps = {
  pulse: PULSE,
  platform: PLATFORM,
  audit: AUDIT,
  invites: INVITES,
  lockedAccounts: LOCKED_ACCOUNTS,
  now: NOW,
};

const mockFetch = jest.fn();

beforeAll(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe('AdminDashboard', () => {
  beforeEach(() => {
    mockUnlockAccount.mockReset();
    mockUnlockAccount.mockResolvedValue({ success: true });
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        services: {
          db: { name: 'Database', status: 'healthy', latencyMs: 12 },
          ai: { name: 'OpenRouter', status: 'degraded', latencyMs: 900, message: 'Slow' },
          mail: { name: 'Email', status: 'unconfigured', latencyMs: null },
        },
      }),
    });
  });

  it('opens with a one-line platform verdict and an invite action', () => {
    render(<AdminDashboard {...baseProps} />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Everything sounds\s*roughly in tune\s*\./ })
    ).toBeInTheDocument();
    expect(screen.getByText('7 students')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Invite user/ })).toHaveAttribute(
      'href',
      '/dashboard/users/new'
    );
  });

  it('says "in tune" when nobody has gone quiet', () => {
    render(
      <AdminDashboard {...baseProps} platform={{ ...PLATFORM, atRisk: [], atRiskCount: 0 }} />
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /Everything sounds\s*in tune\s*\./ })
    ).toBeInTheDocument();
    expect(screen.getByText('Every active student practised this month.')).toBeInTheDocument();
    expect(screen.getByText('Nobody has gone quiet. Lovely.')).toBeInTheDocument();
  });

  it('renders the platform pulse metrics with week-over-week deltas', () => {
    render(<AdminDashboard {...baseProps} />);

    expect(
      screen.getByText('64 students practised or had a lesson in the last 30 days.')
    ).toBeInTheDocument();
    expect(screen.getByText('+28%')).toBeInTheDocument(); // 50 → 64
    expect(screen.getByText('-25%')).toBeInTheDocument(); // 40 → 30
    expect(screen.getByText('82%')).toBeInTheDocument(); // retention
    expect(screen.getByText('+3')).toBeInTheDocument(); // new signups
    expect(screen.getAllByText('340').length).toBeGreaterThanOrEqual(1); // songs (desktop + phone)
    expect(screen.getByText('100')).toBeInTheDocument(); // students strip
    expect(screen.getByText('20')).toBeInTheDocument(); // teachers strip
  });

  it('lists trending-churn students with a profile link and a draft email', () => {
    render(<AdminDashboard {...baseProps} />);

    expect(screen.getByText('7 students at risk')).toBeInTheDocument();
    const link = screen
      .getAllByText('Liam Fox')
      .map((el) => el.closest('a'))
      .find(Boolean);
    expect(link).toHaveAttribute('href', '/dashboard/users/student-liam');
    expect(screen.getByRole('link', { name: 'Draft email' })).toHaveAttribute(
      'href',
      'mailto:liam@example.com'
    );
  });

  it('renders cohort health by tenure', () => {
    render(<AdminDashboard {...baseProps} />);

    expect(screen.getByText('100 students across the platform')).toBeInTheDocument();
    expect(screen.getByText('New (0–3 mo)')).toBeInTheDocument();
    expect(screen.getByText('Active (3–12 mo)')).toBeInTheDocument();
    expect(screen.getByText('Long-term (1y+)')).toBeInTheDocument();
    expect(screen.getByText('Dormant 8')).toBeInTheDocument();
  });

  it('loads live service checks after paint and leaves unconfigured ones out', async () => {
    render(<AdminDashboard {...baseProps} />);

    expect(mockFetch).toHaveBeenCalledWith('/api/health', { cache: 'no-store' });
    await waitFor(() => expect(screen.getAllByText('1/2 OK').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Database').length).toBeGreaterThan(0);
    expect(screen.queryByText('Email')).not.toBeInTheDocument();
    expect(screen.getByText('Slow')).toBeInTheDocument();
  });

  it('renders the audit log and filters it by role', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard {...baseProps} />);

    expect(screen.getByText('Lesson #12')).toBeInTheDocument();
    expect(screen.getByText('45m ago')).toBeInTheDocument();
    expect(screen.getByText('2d ago')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'admin' }));
    expect(screen.getByRole('button', { name: 'admin' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Lesson #12')).not.toBeInTheDocument();
    expect(screen.getByText('Noah Bell')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'system' }));
    expect(screen.getByText('Nothing recorded.')).toBeInTheDocument();
  });

  it('renders pending invites with relative timestamps', () => {
    render(<AdminDashboard {...baseProps} />);

    expect(screen.getByText('Pending invites')).toBeInTheDocument();
    expect(screen.getByText('2 open')).toBeInTheDocument();

    expect(screen.getByText('new.teacher@example.com')).toBeInTheDocument();
    expect(screen.getByText('invited today')).toBeInTheDocument();

    expect(screen.getByText('pending.student@example.com')).toBeInTheDocument();
    expect(screen.getByText('invited Jun 1')).toBeInTheDocument();
  });

  it('shows the no-pending-invites empty state', () => {
    render(<AdminDashboard {...baseProps} invites={[]} />);

    expect(screen.getByText('No pending invitations.')).toBeInTheDocument();
    expect(screen.queryByText('new.teacher@example.com')).not.toBeInTheDocument();
  });

  it('renders locked accounts and unlocks one on click', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard {...baseProps} />);

    expect(screen.getByText('Locked accounts')).toBeInTheDocument();
    expect(screen.getByText('Marta Kowalska')).toBeInTheDocument();
    expect(screen.getByText(/5 failed attempts · locked until/)).toBeInTheDocument();

    await user.click(screen.getByTestId('unlock-account-user-9'));

    expect(mockUnlockAccount).toHaveBeenCalledWith('user-9');
  });

  it('hides the locked accounts card when there are no locked accounts', () => {
    render(<AdminDashboard {...baseProps} lockedAccounts={[]} />);

    expect(screen.queryByText('Locked accounts')).not.toBeInTheDocument();
    expect(screen.queryByTestId('locked-accounts-list')).not.toBeInTheDocument();
  });

  it('points the Strummy AI strip at the quietest student', () => {
    render(<AdminDashboard {...baseProps} />);

    const strip = screen.getByText('Strummy AI').closest('section') as HTMLElement;
    expect(
      within(strip).getByText('“Liam Fox has been quiet longest. Want a re-engagement plan?”')
    ).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: 'Draft plan' })).toHaveAttribute(
      'href',
      '/dashboard/ai'
    );
  });
});
