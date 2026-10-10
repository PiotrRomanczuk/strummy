/**
 * Component tests: StudentDetail page shell
 *
 * Covers the shell around the dedicated Repertoire test
 * (__tests__/components/users/student-detail-repertoire.test.tsx):
 *  - profile header (breadcrumb, name/email/"Since" date, fallbacks, shadow badge)
 *  - instrument · level meta line (profile first, onboarding preferences second)
 *  - health badge + "Needs attention" banner with reach-out CTA (at-risk framing)
 *  - shadow-only actions (invite/delete) gating + "Import songs" link
 *  - stat tiles (streak, attendance, repertoire, lessons completed)
 *  - Overview: practice minutes, recent activity, next lesson, teacher notes
 *  - tab switching to Repertoire / Lessons / Practice Log
 *
 * @see components/users/StudentDetail.tsx
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import type {
  StudentPreferences,
  StudentProfile,
  StudentRecentLesson,
  StudentRepertoireRow,
} from '@/lib/services/student-detail-queries';
import type { PracticeDay } from '@/lib/services/student-health.helpers';
import type { NextLesson, PracticeSessionRow } from '@/lib/services/student-health-queries';

const mockRefresh = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ refresh: mockRefresh, push: mockPush })),
}));

const mockUpdateRepertoireEntryAction = jest.fn();
jest.mock('@/app/actions/repertoire', () => ({
  updateRepertoireEntryAction: (...args: unknown[]) => mockUpdateRepertoireEntryAction(...args),
}));

const mockInviteShadowUser = jest.fn();
const mockDeleteShadowUser = jest.fn();
jest.mock('@/app/dashboard/actions', () => ({
  inviteShadowUser: (...args: unknown[]) => mockInviteShadowUser(...args),
  deleteShadowUser: (...args: unknown[]) => mockDeleteShadowUser(...args),
}));

/** Practice is off in production; mocked mutably so both states stay covered. */
jest.mock('@/lib/config/features', () => ({ SHOW_PRACTICE_FEATURES: false }));
const featuresMock = jest.requireMock('@/lib/config/features') as {
  SHOW_PRACTICE_FEATURES: boolean;
};

beforeEach(() => {
  featuresMock.SHOW_PRACTICE_FEATURES = false;
});

import { StudentDetail } from '@/components/users/StudentDetail';
import { renderServerTree as render } from '@/lib/testing/intl-test-utils';
import { resolveServerTree } from '@/lib/testing/resolve-async-server-components';

const daysAgoIso = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();

const buildProfile = (overrides: Partial<StudentProfile> = {}): StudentProfile => ({
  id: 'student-1',
  fullName: 'Jamie Fret',
  email: 'jamie@example.com',
  createdAt: '2026-01-15T12:00:00Z',
  isShadow: false,
  inviteEmail: null,
  hasSignedIn: true,
  phone: null,
  instrument: null,
  skillLevel: null,
  avatarColor: null,
  startDate: null,
  ...overrides,
});

const buildRepertoireRow = (
  overrides: Partial<StudentRepertoireRow> = {}
): StudentRepertoireRow => ({
  id: 'repertoire-1',
  songId: 'song-1',
  songTitle: 'Wonderwall',
  songAuthor: 'Oasis',
  status: 'to_learn',
  totalPracticeMinutes: 0,
  lastPracticedAt: null,
  ...overrides,
});

const buildLesson = (overrides: Partial<StudentRecentLesson> = {}): StudentRecentLesson => ({
  id: 'lesson-1',
  scheduledAt: '2026-01-20T12:00:00Z',
  status: 'completed',
  title: 'Intro to chords',
  notes: null,
  ...overrides,
});

const buildPreferences = (overrides: Partial<StudentPreferences> = {}): StudentPreferences => ({
  skillLevel: 'beginner',
  goals: ['Fingerstyle', 'Songwriting'],
  learningStyle: [],
  guitars: [],
  ...overrides,
});

type DetailProps = {
  profile?: StudentProfile;
  repertoire?: StudentRepertoireRow[];
  lessons?: StudentRecentLesson[];
  preferences?: StudentPreferences | null;
  practiceHistory?: PracticeDay[];
  practiceSessions?: PracticeSessionRow[];
  nextLesson?: NextLesson;
  canEdit?: boolean;
  lessonsCompleted?: number;
};

const renderDetail = (props: DetailProps = {}) =>
  render(
    <StudentDetail
      profile={props.profile ?? buildProfile()}
      repertoire={props.repertoire ?? []}
      lessons={props.lessons ?? []}
      preferences={props.preferences ?? null}
      practiceHistory={props.practiceHistory ?? []}
      practiceSessions={props.practiceSessions ?? []}
      nextLesson={props.nextLesson ?? null}
      canEdit={props.canEdit}
      lessonsCompleted={props.lessonsCompleted}
    />
  );

const openTab = (name: RegExp) => fireEvent.click(screen.getByRole('tab', { name }));

describe('StudentDetail', () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    mockPush.mockReset();
    mockUpdateRepertoireEntryAction.mockReset();
    mockInviteShadowUser.mockReset();
    mockDeleteShadowUser.mockReset();
  });

  it('renders the profile header: breadcrumb, name, email, and since date', async () => {
    await renderDetail();
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Students' })).toHaveAttribute(
      'href',
      '/dashboard/users'
    );
    expect(within(crumbs).getByText('Jamie Fret')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Jamie Fret/ })).toBeInTheDocument();
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument();
    expect(screen.getByText('Since Jan 15, 2026')).toBeInTheDocument();
  });

  it('prefers the profile start date over the account creation date', async () => {
    await renderDetail({ profile: buildProfile({ startDate: '2025-09-01T12:00:00Z' }) });
    expect(screen.getByText('Since Sep 1, 2025')).toBeInTheDocument();
  });

  it('links "Schedule lesson" to a new lesson pre-filled with this student', async () => {
    await renderDetail({ profile: buildProfile({ id: 'student-42' }) });
    expect(screen.getByRole('link', { name: 'Schedule lesson' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/new?studentId=student-42'
    );
  });

  it('falls back to email when fullName is missing', async () => {
    await renderDetail({ profile: buildProfile({ fullName: null, email: 'noname@example.com' }) });
    expect(
      screen.getByRole('heading', { level: 1, name: /noname@example.com/ })
    ).toBeInTheDocument();
  });

  it('falls back to "Student" and hides the email line when both name and email are missing', async () => {
    await renderDetail({ profile: buildProfile({ fullName: null, email: null }) });
    expect(screen.getByRole('heading', { level: 1, name: /Student/ })).toBeInTheDocument();
    expect(screen.queryByText('jamie@example.com')).not.toBeInTheDocument();
  });

  // The badge, the days-since-practice line and the reach-out prompt are all
  // days-since-practice verdicts, so they go dark together and the CTA falls
  // back to the neutral "Message".
  it('hides the health badge and reach-out CTA when practice is off', async () => {
    await renderDetail();
    expect(screen.queryByTestId('student-health-badge')).not.toBeInTheDocument();
    expect(screen.queryByText(/No practice logged yet/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reach out' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Message' })).toBeInTheDocument();
  });

  it('shows an at-risk health badge and reach-out CTA when the student has never practiced', async () => {
    featuresMock.SHOW_PRACTICE_FEATURES = true;
    await renderDetail();
    const badge = screen.getByTestId('student-health-badge');
    expect(badge).toHaveAttribute('data-status', 'at_risk');
    expect(badge).toHaveTextContent('At risk');
    expect(screen.getByText(/No practice logged yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reach out' })).toHaveAttribute(
      'href',
      'mailto:jamie@example.com'
    );
  });

  it('shows an on-track badge and a Message CTA for a recently-practiced student', async () => {
    featuresMock.SHOW_PRACTICE_FEATURES = true;
    await renderDetail({ repertoire: [buildRepertoireRow({ lastPracticedAt: daysAgoIso(2) })] });
    const badge = screen.getByTestId('student-health-badge');
    expect(badge).toHaveAttribute('data-status', 'on_track');
    expect(screen.getByRole('link', { name: 'Message' })).toBeInTheDocument();
  });

  it('shows the shadow badge and shadow-only actions for a shadow profile', async () => {
    await renderDetail({
      profile: buildProfile({ isShadow: true, inviteEmail: 'invite@example.com' }),
    });
    expect(screen.getByText('Unclaimed')).toBeInTheDocument();
    expect(screen.getByTestId('invite-shadow-open')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('hides the shadow badge and shadow-only actions for a claimed profile', async () => {
    await renderDetail({ profile: buildProfile({ isShadow: false }) });
    expect(screen.queryByText('Unclaimed')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invite-shadow-open')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('renders the "Import songs" link pointing at the student\'s import route', async () => {
    await renderDetail({ profile: buildProfile({ id: 'student-42' }) });
    expect(screen.getByRole('link', { name: 'Import songs' })).toHaveAttribute(
      'href',
      '/dashboard/users/student-42/import'
    );
  });

  it('falls back to the onboarding skill level when the profile has none', async () => {
    await renderDetail({ preferences: buildPreferences({ skillLevel: 'beginner' }) });
    expect(screen.getByText('beginner')).toBeInTheDocument();
  });

  it('shows the profile instrument and level, preferring them over onboarding answers', async () => {
    await renderDetail({
      profile: buildProfile({ instrument: 'Guitar', skillLevel: 'intermediate' }),
      preferences: buildPreferences({ skillLevel: 'beginner' }),
    });
    expect(screen.getByText('Guitar · intermediate')).toBeInTheDocument();
    expect(screen.queryByText('beginner')).not.toBeInTheDocument();
  });

  it('renders an unknown instrument verbatim instead of dropping it', async () => {
    await renderDetail({ profile: buildProfile({ instrument: 'lap-steel' }) });
    expect(screen.getByText('lap-steel')).toBeInTheDocument();
  });

  it('omits the instrument/level line when neither is known', async () => {
    await renderDetail({ preferences: null });
    expect(screen.queryByText('beginner')).not.toBeInTheDocument();
    expect(screen.queryByText(/ · /)).not.toBeInTheDocument();
  });

  it('shows the phone number in the meta line when present', async () => {
    await renderDetail({ profile: buildProfile({ phone: '+48 600 100 200' }) });
    expect(screen.getByText('+48 600 100 200')).toBeInTheDocument();
  });

  const REPERTOIRE_FOR_STATS = () => [
    buildRepertoireRow({ id: 'r1', songId: 's1', status: 'mastered', totalPracticeMinutes: 120 }),
    buildRepertoireRow({ id: 'r2', songId: 's2', status: 'started', totalPracticeMinutes: 30 }),
    buildRepertoireRow({ id: 'r3', songId: 's3', status: 'to_learn', totalPracticeMinutes: 0 }),
  ];

  /** Value + unit of the stat tile with the given label. */
  const tile = (label: string) => {
    const tiles = document.querySelector('.ui-stat-tiles') as HTMLElement;
    const labelEl = within(tiles).getByText(label);
    return labelEl.parentElement!.parentElement!;
  };

  it('counts repertoire songs and completed lessons in the stat tiles', async () => {
    await renderDetail({ repertoire: REPERTOIRE_FOR_STATS(), lessonsCompleted: 7 });
    expect(tile('Repertoire')).toHaveTextContent(/3\s*songs/);
    expect(tile('Lessons')).toHaveTextContent(/7\s*completed/);
  });

  it('shows zeroed tiles and no attendance figure for a brand-new student', async () => {
    await renderDetail();
    expect(tile('Repertoire')).toHaveTextContent(/0\s*songs/);
    expect(tile('Lessons')).toHaveTextContent(/0\s*completed/);
    expect(tile('Attendance')).toHaveTextContent(/—\s*last 0/);
    expect(tile('Practice streak')).toHaveTextContent(/0\s*days/);
  });

  it('computes attendance from past lessons only', async () => {
    await renderDetail({
      lessons: [
        buildLesson({ id: 'l1', scheduledAt: daysAgoIso(14), status: 'completed' }),
        buildLesson({ id: 'l2', scheduledAt: daysAgoIso(7), status: 'cancelled' }),
        buildLesson({ id: 'l3', scheduledAt: daysAgoIso(3), status: 'completed' }),
        buildLesson({ id: 'l4', scheduledAt: daysAgoIso(1), status: 'completed' }),
        // Future lesson must not count either way.
        buildLesson({ id: 'l5', scheduledAt: daysAgoIso(-3), status: 'scheduled' }),
      ],
    });
    expect(tile('Attendance')).toHaveTextContent(/75%\s*last 4/);
  });

  it('swaps the streak tile for "Last practiced" when an at-risk student has no streak', async () => {
    featuresMock.SHOW_PRACTICE_FEATURES = true;
    await renderDetail({ repertoire: [buildRepertoireRow({ lastPracticedAt: daysAgoIso(20) })] });
    expect(tile('Last practiced')).toHaveTextContent(/20\s*days ago/);
    expect(screen.getByText('Needs attention ·')).toBeInTheDocument();
  });

  const PRACTICE_HISTORY = (): PracticeDay[] =>
    Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      minutes: 10,
    }));

  it('omits the practice chart from the Overview tab when practice is off', async () => {
    await renderDetail({ practiceHistory: PRACTICE_HISTORY() });
    expect(screen.queryByText('Practice minutes')).not.toBeInTheDocument();
  });

  it('renders the practice chart with the trailing-week total on the Overview tab', async () => {
    featuresMock.SHOW_PRACTICE_FEATURES = true;
    await renderDetail({ practiceHistory: PRACTICE_HISTORY() });
    expect(screen.getByText('Practice minutes')).toBeInTheDocument();
    // trailing 7 days * 10 min = 70, and the same as the week before
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('min this week')).toBeInTheDocument();
    expect(screen.getByText('0% vs prior')).toBeInTheDocument();
  });

  it('renders the next lesson with a link to it, or a schedule nudge when empty', async () => {
    const nextLesson: NextLesson = {
      id: 'lesson-9',
      scheduledAt: '2026-08-01T15:00:00Z',
      status: 'scheduled',
      title: 'Week 3',
    };
    const { rerender } = await renderDetail({ nextLesson });
    expect(screen.getByText('Week 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View lesson' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-9'
    );

    // StudentDetailHeader is an async Server Component (reads translations),
    // so the tree must be re-resolved before RTL's synchronous rerender.
    rerender(
      await resolveServerTree(
        <StudentDetail
          profile={buildProfile()}
          repertoire={[]}
          lessons={[]}
          preferences={null}
          practiceHistory={[]}
          practiceSessions={[]}
          nextLesson={null}
        />
      )
    );
    expect(screen.getByText('Not scheduled')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Schedule lesson →/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons/new?studentId=student-1'
    );
  });

  it('turns the empty next-lesson nudge into "Reschedule now" for an at-risk student', async () => {
    featuresMock.SHOW_PRACTICE_FEATURES = true;
    await renderDetail();
    expect(screen.getByRole('link', { name: /Reschedule now/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons/new?studentId=student-1'
    );
  });

  it('renders teacher notes sourced from the latest lessons, newest flagged', async () => {
    await renderDetail({
      lessons: [
        buildLesson({
          id: 'lesson-5',
          title: 'Barre chords',
          notes: 'Great progress on the F chord.',
        }),
        buildLesson({ id: 'lesson-4', notes: '   ' }),
      ],
    });
    expect(screen.getByText('Teacher notes')).toBeInTheDocument();
    expect(screen.getByText('Great progress on the F chord.')).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
    // Blank notes are skipped, so exactly one "Open lesson" link.
    expect(screen.getByRole('link', { name: /Open lesson/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-5'
    );
  });

  it('shows the teacher-notes empty state when no lesson has notes', async () => {
    await renderDetail({ lessons: [buildLesson()] });
    expect(screen.getByText('No teacher notes yet.')).toBeInTheDocument();
  });

  it('lists recent practice and past lessons in the activity card', async () => {
    await renderDetail({
      lessons: [
        buildLesson({ id: 'l1', scheduledAt: daysAgoIso(2), status: 'completed', title: 'Riffs' }),
        buildLesson({
          id: 'l2',
          scheduledAt: daysAgoIso(5),
          status: 'cancelled',
          title: 'Skipped',
        }),
      ],
      practiceSessions: [
        {
          id: 'ps-1',
          createdAt: daysAgoIso(1),
          durationMinutes: 25,
          songTitle: 'Blackbird',
          notes: null,
        },
      ],
    });
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('Logged 25 min practice')).toBeInTheDocument();
    expect(screen.getByText('Lesson completed')).toBeInTheDocument();
    expect(screen.getByText('Lesson missed')).toBeInTheDocument();
  });

  it('delegates repertoire rows to the Repertoire tab with canEdit=false by default', async () => {
    await renderDetail({ repertoire: [buildRepertoireRow()] });
    openTab(/Repertoire/);
    expect(screen.getByText('Songs the student is learning')).toBeInTheDocument();
    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('passes canEdit=true through to the Repertoire tab', async () => {
    await renderDetail({ repertoire: [buildRepertoireRow()], canEdit: true });
    openTab(/Repertoire/);
    expect(screen.getByRole('combobox', { name: /status for wonderwall/i })).toBeInTheDocument();
  });

  it('renders the repertoire empty state on the Repertoire tab', async () => {
    await renderDetail();
    openTab(/Repertoire/);
    expect(screen.getByText('No songs assigned yet.')).toBeInTheDocument();
  });

  it('collapses long repertoires to 12 rows with a Show all toggle', async () => {
    const repertoire = Array.from({ length: 15 }, (_, i) =>
      buildRepertoireRow({ id: `r${i}`, songId: `s${i}`, songTitle: `Song ${i + 1}` })
    );
    await renderDetail({ repertoire });
    openTab(/Repertoire/);

    expect(screen.getByText('Song 12')).toBeInTheDocument();
    expect(screen.queryByText('Song 13')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all 15 songs' }));
    expect(screen.getByText('Song 15')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByText('Song 13')).not.toBeInTheDocument();
  });

  it('omits the Show all toggle when the repertoire fits in the collapsed view', async () => {
    await renderDetail({ repertoire: [buildRepertoireRow()] });
    openTab(/Repertoire/);
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
  });

  it('shows the total song count in the repertoire card header', async () => {
    const repertoire = Array.from({ length: 15 }, (_, i) =>
      buildRepertoireRow({ id: `r${i}`, songId: `s${i}`, songTitle: `Song ${i + 1}` })
    );
    await renderDetail({ repertoire });
    openTab(/Repertoire/);
    expect(screen.getByText('15 songs')).toBeInTheDocument();
  });

  it('shows the activity empty state on the Overview tab', async () => {
    await renderDetail();
    expect(screen.getByText('Nothing yet.')).toBeInTheDocument();
  });

  it('renders the lessons empty state on the Lessons tab', async () => {
    await renderDetail();
    openTab(/^Lessons/);
    expect(screen.getByText('No lessons yet.')).toBeInTheDocument();
  });

  it('renders lesson rows with formatted date, status, and a link to the lesson', async () => {
    const lesson = buildLesson();
    const expectedDate = new Date(lesson.scheduledAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    await renderDetail({ lessons: [lesson] });
    openTab(/^Lessons/);
    expect(screen.getByText('Intro to chords')).toBeInTheDocument();
    expect(screen.getByText(`${expectedDate} · completed`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Intro to chords/i })).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-1'
    );
  });

  it('falls back to "Untitled lesson" when a lesson has no title', async () => {
    await renderDetail({ lessons: [buildLesson({ title: null })] });
    openTab(/^Lessons/);
    expect(screen.getByText('Untitled lesson')).toBeInTheDocument();
  });

  const PRACTICE_SESSIONS = (): PracticeSessionRow[] => [
    {
      id: 'ps-1',
      createdAt: '2026-07-20T09:00:00Z',
      durationMinutes: 25,
      songTitle: 'Blackbird',
      notes: 'Slow but steady',
    },
  ];

  it('drops the Practice Log tab entirely when practice is off', async () => {
    await renderDetail({ practiceSessions: PRACTICE_SESSIONS() });
    expect(screen.queryByRole('tab', { name: /Practice Log/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Slow but steady')).not.toBeInTheDocument();
  });

  it('shows logged practice sessions on the Practice Log tab', async () => {
    featuresMock.SHOW_PRACTICE_FEATURES = true;
    const practiceSessions = PRACTICE_SESSIONS();
    await renderDetail({ practiceSessions });
    openTab(/Practice Log/);
    expect(screen.getByText('Blackbird')).toBeInTheDocument();
    expect(screen.getByText('Slow but steady')).toBeInTheDocument();
    expect(screen.getByText('25m')).toBeInTheDocument();
  });
});
