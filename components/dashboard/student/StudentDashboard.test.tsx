/**
 * Shell-level render coverage for the Claude Design StudentDashboard ("what do
 * I practice today?"): the hero (countdown to the next lesson + today's set
 * list), last-lesson recap with homework, repertoire with stage filters,
 * streak, activity, achievements and the song-of-the-week side card.
 *
 * jsdom applies no media queries, so the phone composition (StudentMobileTop)
 * renders alongside the desktop one. Desktop assertions are scoped to the hero
 * (`.ui-student-hero`) and the secondary grid (`.ui-student-secondary`).
 *
 * @see components/dashboard/student/StudentDashboard.tsx
 */
import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { StudentDashboard } from './StudentDashboard';
import type { StudentHomeData } from './student-home.data';
import { deriveAchievements, featuredAchievements, weekStrip } from './student-home.helpers';

const mockGetSotw = jest.fn();
jest.mock('@/app/actions/song-of-the-week', () => ({
  getCurrentSongOfTheWeek: () => mockGetSotw(),
  addSotwToRepertoire: jest.fn(),
}));

// Local time components (not a 'Z' ISO literal) so relative-day and countdown
// math behave the same regardless of the machine/CI timezone running the suite.
const NOW = new Date(2026, 6, 20, 9, 30, 0); // Monday

const achievements = deriveAchievements({
  sessions: 4,
  streak: 3,
  songs: 2,
  mastered: 1,
  practiceMinutes: 170,
});

const buildHome = (overrides: Partial<StudentHomeData> = {}): StudentHomeData => ({
  nextLesson: {
    id: 'lesson-9',
    scheduledAt: new Date(2026, 6, 20, 15, 0, 0).toISOString(), // 5h30m from NOW
    durationMinutes: 45,
    format: null,
    notes: 'Bring the capo.\nWe will start on the bridge.',
    teacher: { name: 'Marco Reyes', email: 'marco@example.com', color: null },
  },
  lastLesson: {
    id: 'lesson-8',
    scheduledAt: new Date(2026, 6, 13, 15, 0, 0).toISOString(),
    notes: 'Great progress on the F barre chord.',
  },
  homework: [
    { id: 'hw-1', task: 'Chord transitions G → C', isDone: true, daysPracticed: 7 },
    { id: 'hw-2', task: 'Strumming pattern 2', isDone: false, daysPracticed: 3 },
  ],
  practiceSet: [
    {
      assignmentId: 'assign-1',
      songId: 'song-wonderwall',
      title: 'Wonderwall',
      sub: 'Oasis',
      musicalKey: 'Em',
      minutes: 15,
      isSong: true,
      isDoneToday: false,
    },
    {
      assignmentId: 'assign-2',
      songId: null,
      title: 'Spider exercise',
      sub: null,
      musicalKey: null,
      minutes: 10,
      isSong: false,
      isDoneToday: true,
    },
  ],
  minutesToday: 10,
  week: weekStrip([], NOW),
  streak: 3,
  repertoire: [
    {
      songId: 'song-wonderwall',
      title: 'Wonderwall',
      author: 'Oasis',
      musicalKey: 'Em',
      capo: 2,
      status: 'started',
      minutes: 125,
      lastPracticedAt: null,
    },
    {
      songId: 'song-blackbird',
      title: 'Blackbird',
      author: null,
      musicalKey: 'G',
      capo: null,
      status: 'mastered',
      minutes: 45,
      lastPracticedAt: null,
    },
  ],
  agoBySong: { 'song-wonderwall': '2d', 'song-blackbird': null },
  activity: [
    {
      id: 'act-1',
      kind: 'assignment',
      at: new Date(2026, 6, 20, 8, 30, 0).toISOString(),
      actor: 'Marco Reyes',
      object: 'Wonderwall',
      stage: null,
    },
    {
      id: 'act-2',
      kind: 'mastered',
      at: new Date(2026, 6, 17, 9, 30, 0).toISOString(),
      actor: null,
      object: 'Blackbird',
      stage: null,
    },
  ],
  achievements: {
    featured: featuredAchievements(achievements),
    unlocked: achievements.filter((a) => a.isUnlocked).length,
    total: achievements.length,
  },
  ...overrides,
});

const renderDashboard = (home: StudentHomeData = buildHome()) =>
  renderServerTree(
    <StudentDashboard home={home} now={NOW} fullName="Jamie Fret" email="jamie@example.com" />
  );

const hero = () => within(document.querySelector('.ui-student-hero') as HTMLElement);
const secondary = () => within(document.querySelector('.ui-student-secondary') as HTMLElement);

beforeEach(() => {
  mockGetSotw.mockReset();
  mockGetSotw.mockResolvedValue(null);
});

describe('StudentDashboard', () => {
  it('keeps an accessible page title for the document outline', async () => {
    await renderDashboard();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Jamie · Dashboard' })
    ).toBeInTheDocument();
  });

  describe('hero: next lesson countdown', () => {
    it('counts down to the next lesson with the teacher and a link to it', async () => {
      await renderDashboard();

      expect(hero().getByText('5h 30m')).toBeInTheDocument();
      expect(hero().getByText('Marco Reyes')).toBeInTheDocument();
      expect(hero().getByRole('link', { name: /Today/ })).toHaveAttribute(
        'href',
        '/dashboard/lessons/lesson-9'
      );
      expect(hero().getByText(/· 45m/)).toBeInTheDocument();
    });

    it('offers practice and a reschedule email to the teacher', async () => {
      await renderDashboard();

      expect(hero().getByRole('link', { name: /Start today's practice/ })).toHaveAttribute(
        'href',
        '/dashboard/practice'
      );
      const reschedule = hero().getByRole('link', { name: 'Reschedule' });
      expect(reschedule.getAttribute('href')).toMatch(/^mailto:marco@example\.com\?subject=/);
    });

    it('shows the no-lesson state without a reschedule link', async () => {
      await renderDashboard(buildHome({ nextLesson: null }));

      expect(hero().getByText('No lesson booked')).toBeInTheDocument();
      expect(
        hero().getByText('Once your teacher schedules a lesson, the countdown starts here.')
      ).toBeInTheDocument();
      expect(hero().queryByRole('link', { name: 'Reschedule' })).not.toBeInTheDocument();
    });
  });

  describe("hero: today's practice set", () => {
    it('lists the open pieces with their minutes and the day’s progress', async () => {
      await renderDashboard();

      expect(hero().getByText('25 min · 2 pieces')).toBeInTheDocument();
      expect(hero().getByText('10/25 min')).toBeInTheDocument();
      expect(hero().getByText('Spider exercise')).toBeInTheDocument();
      expect(hero().getByRole('link', { name: 'Open Wonderwall' })).toHaveAttribute(
        'href',
        '/dashboard/assignments/assign-1'
      );
    });

    it("quotes the first line of the teacher's plan note", async () => {
      await renderDashboard();

      expect(hero().getByText("Marco's note:")).toBeInTheDocument();
      expect(hero().getByText('“Bring the capo.”')).toBeInTheDocument();
    });

    it('shows the empty set copy when nothing is assigned', async () => {
      await renderDashboard(buildHome({ practiceSet: [] }));

      expect(hero().getByText(/Nothing assigned right now/)).toBeInTheDocument();
    });
  });

  describe('last lesson recap', () => {
    it('quotes the recap and lists the homework with progress', async () => {
      await renderDashboard();

      expect(secondary().getByText('“Great progress on the F barre chord.”')).toBeInTheDocument();
      expect(secondary().getByRole('link', { name: 'Open lesson →' })).toHaveAttribute(
        'href',
        '/dashboard/lessons/lesson-8'
      );
      expect(secondary().getByText('Chord transitions G → C')).toBeInTheDocument();
      expect(secondary().getByText('Done')).toBeInTheDocument();
      expect(secondary().getByText('3/7d')).toBeInTheDocument();
    });

    it('shows the first-recap placeholder when there is no past lesson', async () => {
      await renderDashboard(buildHome({ lastLesson: null, homework: [] }));

      expect(
        secondary().getByText('Your first lesson recap will show up here.')
      ).toBeInTheDocument();
    });
  });

  describe('repertoire', () => {
    it('lists every song with its key, practice time and a link to it', async () => {
      await renderDashboard();

      expect(secondary().getByText('2 songs ·')).toBeInTheDocument();
      expect(secondary().getByText('1 mastered')).toBeInTheDocument();
      expect(secondary().getByText(/capo 2/)).toBeInTheDocument();
      expect(secondary().getByText('2h 5m')).toBeInTheDocument();
      expect(secondary().getByText('2d ago')).toBeInTheDocument();
      expect(secondary().getByText('Blackbird').closest('a')).toHaveAttribute(
        'href',
        '/dashboard/songs/song-blackbird'
      );
    });

    it('filters by stage and shows an empty-filter message', async () => {
      await renderDashboard();
      // All, then the five stages in order: to learn … mastered.
      const tabs = secondary().getAllByRole('tab');
      expect(tabs).toHaveLength(6);
      const [all, toLearn, , , , mastered] = tabs;
      expect(all).toHaveAttribute('aria-selected', 'true');

      fireEvent.click(mastered);
      expect(mastered).toHaveAttribute('aria-selected', 'true');
      expect(secondary().queryByText('Wonderwall')).not.toBeInTheDocument();
      expect(secondary().getByText('Blackbird')).toBeInTheDocument();

      fireEvent.click(toLearn);
      expect(secondary().getByText('No songs at this stage.')).toBeInTheDocument();
    });

    it('shows the empty repertoire copy for a new student', async () => {
      await renderDashboard(buildHome({ repertoire: [], agoBySong: {} }));

      expect(secondary().getByText(/No songs yet\./)).toBeInTheDocument();
    });
  });

  describe('side column', () => {
    it('shows the streak and the distance to the next badge', async () => {
      await renderDashboard();

      expect(secondary().getByText('4 more days to your')).toBeInTheDocument();
      expect(secondary().getByText('7-day badge')).toBeInTheDocument();
    });

    it('describes recent activity, newest first', async () => {
      await renderDashboard();

      expect(secondary().getByText('Marco assigned')).toBeInTheDocument();
      expect(secondary().getByText('“Wonderwall”')).toBeInTheDocument();
      expect(secondary().getByText('You mastered')).toBeInTheDocument();
      expect(secondary().getByText('1h 0m ago')).toBeInTheDocument();
    });

    it('shows the activity empty state', async () => {
      await renderDashboard(buildHome({ activity: [] }));

      expect(secondary().getByText(/Nothing yet — your practice/)).toBeInTheDocument();
    });

    it('lists featured achievements with the unlocked count', async () => {
      await renderDashboard();

      expect(secondary().getByText('Achievements')).toBeInTheDocument();
      expect(secondary().getByText('2/8')).toBeInTheDocument();
      expect(secondary().getByText('First session')).toBeInTheDocument();
      expect(secondary().getAllByText('Unlocked').length).toBe(2);
    });

    it('renders the song of the week card only when one is active', async () => {
      mockGetSotw.mockResolvedValue({
        song_id: 'song-hotel',
        teacher_message: 'Focus on the intro.',
        song: { title: 'Hotel California', author: 'Eagles' },
      });
      await renderDashboard();

      expect(screen.getByText('Hotel California').closest('a')).toHaveAttribute(
        'href',
        '/dashboard/songs/song-hotel'
      );
      expect(screen.getByText('“Focus on the intro.”')).toBeInTheDocument();
    });

    it('omits the song of the week card when none is active', async () => {
      await renderDashboard();

      expect(screen.queryByText('Song of the week')).not.toBeInTheDocument();
    });
  });
});
