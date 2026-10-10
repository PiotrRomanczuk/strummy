/**
 * Shell-level render coverage for TeacherDashboard — the Claude Design teacher
 * dashboard composing TeacherGreeting, TeacherDaySpine, NeedsAttentionCard,
 * WeekDensityCard, WeekCompareCard, StudioRosterCard and SongLibraryCard, plus
 * the phone-only TeacherMobileTop/DashboardMobileHeader.
 *
 * jsdom applies no media queries, so the phone and desktop compositions both
 * render. Desktop-only assertions are scoped to the `.ui-grid-hero` section or
 * use `getAllBy*` where a name legitimately appears in both.
 *
 * @see components/dashboard/teacher/TeacherDashboard.tsx
 */
import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { TeacherDashboard } from './TeacherDashboard';

/** Practice is off in production; mocked mutably so both states stay covered. */
jest.mock('@/lib/config/features', () => ({ SHOW_PRACTICE_FEATURES: false }));
const featuresMock = jest.requireMock('@/lib/config/features') as {
  SHOW_PRACTICE_FEATURES: boolean;
};

beforeEach(() => {
  featuresMock.SHOW_PRACTICE_FEATURES = false;
});

import type {
  AtRiskStudent,
  OverdueAssignmentRow,
  Utilization,
  WeekDensityDay,
} from '@/lib/services/teacher-dashboard-backfill-queries';
import type {
  LibrarySong,
  StudioStudent,
  WeekComparison,
} from '@/lib/services/teacher-dashboard-studio-queries';
import type { DayLesson, TeacherDayStats } from '@/lib/services/teacher-dashboard-queries';

// Local time components (not a 'Z' ISO literal) so greetingFor()/getHours()
// behave the same regardless of the machine/CI timezone running the suite.
const NOW = new Date(2026, 6, 20, 14, 5, 0);

const LESSONS: DayLesson[] = [
  {
    id: 'lesson-1',
    scheduledAt: new Date(2026, 6, 20, 15, 0, 0).toISOString(),
    status: 'scheduled',
    title: null,
    studentId: 'student-emma',
    studentName: 'Emma Stone',
    studentEmail: 'emma@example.com',
    studentLevel: 'beginner',
    studentColor: null,
    durationMinutes: 45,
    songs: [{ songId: 'song-halleluja', title: 'Hallelujah', songKey: 'C' }],
  },
];

const STATS: TeacherDayStats = { count: 1, totalMinutes: 45 };

const AT_RISK: AtRiskStudent[] = [
  {
    studentId: 'student-liam',
    name: 'Liam Fox',
    email: 'liam@example.com',
    lastPracticedAt: new Date(2026, 6, 1).toISOString(),
    daysSincePractice: 19,
  },
];

const OVERDUE_ASSIGNMENTS: OverdueAssignmentRow[] = [
  {
    id: 'assign-1',
    title: 'Practice scales',
    dueDate: new Date(2026, 6, 15, 14, 5, 0).toISOString(),
    studentName: 'Noah Bell',
    studentEmail: 'noah@example.com',
  },
];

const WEEK_DENSITY: WeekDensityDay[] = [
  { weekday: 'Mon', count: 2, date: '2026-07-20', isToday: true },
  { weekday: 'Tue', count: 0, date: '2026-07-21', isToday: false },
  { weekday: 'Wed', count: 1, date: '2026-07-22', isToday: false },
  { weekday: 'Thu', count: 3, date: '2026-07-23', isToday: false },
  { weekday: 'Fri', count: 0, date: '2026-07-24', isToday: false },
  { weekday: 'Sat', count: 0, date: '2026-07-25', isToday: false },
  { weekday: 'Sun', count: 0, date: '2026-07-26', isToday: false },
];

const UTILIZATION: Utilization = { bookedHours: 4.5, nominalHours: 40, pct: 11 };

const ROSTER: { total: number; rows: StudioStudent[] } = {
  total: 12,
  rows: [
    {
      studentId: 'student-ivy',
      name: 'Ivy Chen',
      email: 'ivy@example.com',
      color: null,
      level: 'intermediate',
      songs: 5,
      masteredPct: 40,
      daysSincePractice: 2,
      health: 'good',
      nextLessonAt: null,
    },
    {
      studentId: 'student-abe',
      name: 'Abe Lane',
      email: 'abe@example.com',
      color: null,
      level: null,
      songs: 1,
      masteredPct: 0,
      daysSincePractice: null,
      health: 'at_risk',
      nextLessonAt: null,
    },
  ],
};

const COMPARE: WeekComparison = {
  teachingHours: { curr: 4.5, prev: 3 },
  practiceHours: { curr: 2, prev: 3.5 },
  songsAssigned: { curr: 4, prev: 4 },
};

const LIBRARY: { total: number; songs: LibrarySong[] } = {
  total: 87,
  songs: [
    {
      id: 'song-hotel-california',
      title: 'Hotel California',
      author: 'Eagles',
      key: 'Bm',
      capo: 7,
      learners: 3,
    },
  ],
};

const baseProps = {
  fullName: 'Sarah Connor',
  email: 'sarah@example.com',
  now: NOW,
  lessons: LESSONS,
  stats: STATS,
  atRisk: AT_RISK,
  overdueAssignments: OVERDUE_ASSIGNMENTS,
  weekDensity: WEEK_DENSITY,
  utilization: UTILIZATION,
  roster: ROSTER,
  compare: COMPARE,
  library: LIBRARY,
};

const renderDashboard = (overrides: Partial<typeof baseProps> = {}) =>
  renderServerTree(<TeacherDashboard {...baseProps} {...overrides} />);

/** The desktop day spine + side column. */
const heroGrid = () => document.querySelector('.ui-grid-hero') as HTMLElement;

describe('TeacherDashboard', () => {
  it('greets the teacher by first name with today’s lesson summary', async () => {
    await renderDashboard();

    expect(
      screen.getByRole('heading', { level: 1, name: /Good afternoon,\s*Sarah\s*\./ })
    ).toBeInTheDocument();
    expect(screen.getByText('1 lesson')).toBeInTheDocument();
    expect(screen.getByText(/today · 45m of teaching\./)).toBeInTheDocument();
    // Phone header ("Hi, Sarah") renders alongside — media queries don't apply in jsdom.
    expect(screen.getAllByText('Sarah').length).toBeGreaterThanOrEqual(2);
  });

  it('offers the Assignments and New lesson actions from the greeting', async () => {
    await renderDashboard();

    expect(screen.getByRole('link', { name: 'Assignments' })).toHaveAttribute(
      'href',
      '/dashboard/assignments'
    );
    expect(screen.getByRole('link', { name: /New lesson/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons/new'
    );
  });

  it('turns the greeting into a practice insight about the most at-risk student when practice is on', async () => {
    featuresMock.SHOW_PRACTICE_FEATURES = true;
    await renderDashboard();

    expect(screen.getByText(/hasn’t practiced in 19 days/)).toBeInTheDocument();
    expect(screen.queryByText('1 lesson')).not.toBeInTheDocument();
  });

  it('renders today’s schedule with the lesson in TeacherDaySpine', async () => {
    await renderDashboard();
    const spine = within(heroGrid());

    expect(spine.getByText('Today’s schedule')).toBeInTheDocument();
    expect(spine.getByText('Emma Stone')).toBeInTheDocument();
    expect(spine.getByText('Hallelujah')).toBeInTheDocument();
    expect(spine.getByText('· beginner')).toBeInTheDocument();
    // The 3pm lesson is the next one at 2:05pm.
    expect(spine.getByText('Prep →')).toBeInTheDocument();

    expect(spine.getByText('Emma Stone').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-1'
    );
  });

  it('shows "Nothing booked" in the day spine when there are no lessons', async () => {
    await renderDashboard({ lessons: [], stats: { count: 0, totalMinutes: 0 } });

    expect(within(heroGrid()).getByText('Nothing booked')).toBeInTheDocument();
    expect(screen.getByText(/No lessons on your books today\./)).toBeInTheDocument();
  });

  // "At risk" means nothing but days-since-practice, so those flags go dark
  // with the rest of practice; overdue homework still raises a flag.
  it('flags only overdue homework in Needs attention when practice is off', async () => {
    await renderDashboard();
    const grid = within(heroGrid());

    expect(grid.getByText('Needs attention')).toBeInTheDocument();
    expect(grid.getByText('Noah Bell')).toBeInTheDocument();
    expect(grid.getByText('Assignment overdue 5 days')).toBeInTheDocument();
    expect(grid.queryByText('Liam Fox')).not.toBeInTheDocument();
    expect(grid.getByRole('link', { name: 'Reach out' })).toHaveAttribute(
      'href',
      'mailto:noah@example.com'
    );
  });

  it('adds practice gaps to Needs attention when practice is on', async () => {
    featuresMock.SHOW_PRACTICE_FEATURES = true;
    await renderDashboard();
    const grid = within(heroGrid());

    expect(grid.getByText('Liam Fox')).toBeInTheDocument();
    expect(grid.getByText('No practice logged in 19 days')).toBeInTheDocument();
    expect(grid.getByText('2 flags · 2 students')).toBeInTheDocument();
  });

  it('hides the Needs attention card when there is nothing to flag', async () => {
    await renderDashboard({ overdueAssignments: [] });

    expect(within(heroGrid()).queryByText('Needs attention')).not.toBeInTheDocument();
  });

  it('renders week density with the week totals', async () => {
    await renderDashboard();

    expect(screen.getByText('Week 30 · density')).toBeInTheDocument();
    expect(screen.getByText('JUL 20–26')).toBeInTheDocument();
    expect(screen.getByText('6 LESSONS · 4.5h TEACHING · 11% UTILIZATION')).toBeInTheDocument();
  });

  it('compares this week with last', async () => {
    await renderDashboard();

    expect(screen.getByText('This week vs last')).toBeInTheDocument();
    expect(screen.getByText('Teaching hours')).toBeInTheDocument();
    expect(screen.getByText('+1.5')).toBeInTheDocument();
    expect(screen.getByText('-1.5')).toBeInTheDocument();
    expect(screen.getByText('+0')).toBeInTheDocument();
  });

  it('renders the studio roster linking to each student', async () => {
    await renderDashboard();

    expect(screen.getByText('12 active students')).toBeInTheDocument();
    expect(screen.getByText('Ivy Chen').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/users/student-ivy'
    );
    expect(screen.getByText('5 songs')).toBeInTheDocument();
    expect(screen.getByText('2d ago')).toBeInTheDocument();
    expect(screen.getByText('no practice')).toBeInTheDocument();
  });

  it('re-sorts the roster A–Z on demand', async () => {
    await renderDashboard();
    const names = () =>
      Array.from(document.querySelectorAll('.ui-roster-row')).map(
        (row) => row.getAttribute('href') ?? ''
      );

    expect(names()).toEqual(['/dashboard/users/student-ivy', '/dashboard/users/student-abe']);
    fireEvent.click(screen.getByRole('button', { name: 'A–Z' }));
    expect(screen.getByRole('button', { name: 'A–Z' })).toHaveAttribute('aria-pressed', 'true');
    expect(names()).toEqual(['/dashboard/users/student-abe', '/dashboard/users/student-ivy']);
  });

  it('renders the song library quick-assign list', async () => {
    await renderDashboard();

    expect(screen.getByText('87 songs in your library')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open library →' })).toHaveAttribute(
      'href',
      '/dashboard/songs'
    );
    expect(screen.getByText('Hotel California').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/songs/song-hotel-california'
    );
    expect(screen.getByText('3 assigned')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assign' })).toHaveAttribute(
      'href',
      '/dashboard/songs/song-hotel-california#quick-assign'
    );
  });

  it('shows the next lesson as a hero in the phone composition', async () => {
    await renderDashboard();

    expect(screen.getByText('Next · in 55m')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open lesson prep →' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-1'
    );
    expect(screen.getByText('Today · 1 lesson · 45m')).toBeInTheDocument();
  });
});
