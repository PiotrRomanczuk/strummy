/**
 * Shell-level render coverage for StudentDashboard: greeting +
 * next-lesson summary, assignments-due list, and repertoire list, including
 * the internal formatting helpers (formatRelative, formatPracticeTime,
 * formatDueDate, formatTime) and the `../primitives` Card/CardHeader usage.
 *
 * @see components/dashboard/student/StudentDashboard.tsx
 */
import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { StudentDashboard } from './StudentDashboard';

/** Practice is off in production; mocked mutably so both states stay covered. */
jest.mock('@/lib/config/features', () => ({ SHOW_PRACTICE_FEATURES: false }));
const featuresMock = jest.requireMock('@/lib/config/features') as {
  SHOW_PRACTICE_FEATURES: boolean;
};

// SongOfTheWeekBanner is an async Server Component that self-fetches — nothing
// in this shell-level suite exercises the banner itself, so it stays inert.
jest.mock('@/app/actions/song-of-the-week', () => ({
  getCurrentSongOfTheWeek: jest.fn().mockResolvedValue(null),
}));

beforeEach(() => {
  featuresMock.SHOW_PRACTICE_FEATURES = false;
});
import type {
  StudentNextLesson,
  StudentOpenAssignment,
  StudentSongRow,
} from '@/lib/services/student-dashboard-queries';

// Local time components (not a 'Z' ISO literal) so getHours()-driven greeting
// text and the relative-time math behave the same regardless of the
// machine/CI timezone running the suite.
const NOW = new Date(2026, 6, 20, 9, 30, 0);

const NEXT_LESSON: StudentNextLesson = {
  id: 'lesson-9',
  scheduledAt: new Date(2026, 6, 20, 15, 0, 0).toISOString(), // 5h30m from NOW
  title: 'Fingerstyle basics',
  teacherName: 'Mr. Reyes',
};

const SONGS: StudentSongRow[] = [
  {
    songId: 'song-wonderwall',
    title: 'Wonderwall',
    author: 'Oasis',
    status: 'started',
    totalPracticeMinutes: 125,
  },
  {
    songId: 'song-blackbird',
    title: 'Blackbird',
    author: null,
    status: 'mastered',
    totalPracticeMinutes: 45,
  },
];

const OPEN_ASSIGNMENTS: StudentOpenAssignment[] = [
  {
    id: 'assign-1',
    title: 'Practice chord transitions',
    dueDate: new Date(2026, 6, 25).toISOString(),
    isOverdue: false,
  },
  {
    id: 'assign-2',
    title: 'Record cover song',
    dueDate: new Date(2026, 6, 10).toISOString(),
    isOverdue: true,
  },
];

const baseProps = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  now: NOW,
  nextLesson: NEXT_LESSON,
  songs: SONGS,
  openAssignments: OPEN_ASSIGNMENTS,
  userId: 'user-jane',
};

describe('StudentDashboard', () => {
  it('renders the greeting and next-lesson summary with a link to the lesson', async () => {
    await renderServerTree(<StudentDashboard {...baseProps} />);

    expect(screen.getByText('Good morning, Jane.')).toBeInTheDocument();
    expect(screen.getByText('in 5h')).toBeInTheDocument();
    expect(screen.getByText(/with Mr\. Reyes/)).toBeInTheDocument();
    expect(screen.getByText('Fingerstyle basics')).toBeInTheDocument();

    const link = screen.getByText('Mr. Reyes').closest('a');
    expect(link).toHaveAttribute('href', '/dashboard/lessons/lesson-9');
  });

  it('shows the no-lessons empty state when there is no next lesson', async () => {
    await renderServerTree(<StudentDashboard {...baseProps} nextLesson={null} />);

    expect(
      screen.getByText('No upcoming lessons on your calendar. Keep practicing.')
    ).toBeInTheDocument();
    expect(screen.getByText('Next lesson')).toBeInTheDocument();
    expect(
      screen.getByText('Once a teacher schedules a lesson with you, it shows up here.')
    ).toBeInTheDocument();
  });

  it('renders assignments due with overdue styling and links to each assignment', async () => {
    await renderServerTree(<StudentDashboard {...baseProps} />);

    expect(screen.getByText('Assignments due')).toBeInTheDocument();
    expect(screen.getByText('Practice chord transitions')).toBeInTheDocument();
    expect(screen.getByText('Record cover song')).toBeInTheDocument();
    expect(screen.getByText('Overdue · Jul 10')).toBeInTheDocument();

    const overdueLink = screen.getByText('Record cover song').closest('a');
    expect(overdueLink).toHaveAttribute('href', '/dashboard/assignments/assign-2');

    const viewAllLink = screen.getByText('View all →');
    expect(viewAllLink).toHaveAttribute('href', '/dashboard/assignments');
  });

  it('hides the assignments card when there are no open assignments', async () => {
    await renderServerTree(<StudentDashboard {...baseProps} openAssignments={[]} />);

    expect(screen.queryByText('Assignments due')).not.toBeInTheDocument();
  });

  it('renders the repertoire list with status but no practice time', async () => {
    await renderServerTree(<StudentDashboard {...baseProps} />);

    expect(screen.getByText('Songs you’re working on')).toBeInTheDocument();

    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    expect(screen.getByText('Oasis')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();

    expect(screen.getByText('Blackbird')).toBeInTheDocument();
    expect(screen.getByText('Mastered')).toBeInTheDocument();

    // The practice-minutes column is off at SHOW_PRACTICE_FEATURES.
    expect(screen.queryByText('2h 5m')).not.toBeInTheDocument();
    expect(screen.queryByText('45m')).not.toBeInTheDocument();

    const songLink = screen.getByText('Wonderwall').closest('a');
    expect(songLink).toHaveAttribute('href', '/dashboard/songs/song-wonderwall');
  });

  it('renders the practice-time column when the flag is on', async () => {
    featuresMock.SHOW_PRACTICE_FEATURES = true;
    await renderServerTree(<StudentDashboard {...baseProps} />);

    expect(screen.getByText('2h 5m')).toBeInTheDocument();
    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('shows the empty repertoire copy when there are no songs', async () => {
    await renderServerTree(<StudentDashboard {...baseProps} songs={[]} />);

    expect(
      screen.getByText('No songs assigned yet. Your teacher can add them from the song list.')
    ).toBeInTheDocument();
  });
});
