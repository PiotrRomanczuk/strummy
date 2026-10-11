/**
 * Component tests: LessonDetail — the shell backing
 * /dashboard/lessons/[id].
 *
 * The embedded PostLessonSummaryAI generator already has dedicated coverage
 * (components/lessons/PostLessonSummaryAI.test.tsx), so here it is mocked to
 * a lightweight stub. The per-song stepper's server action is likewise mocked
 * so these tests stay in jsdom and only assert the wiring: which stage the
 * click maps to, and that students never see interactive controls.
 *
 * jsdom applies no media queries, so the phone composition
 * (LessonDetail.Mobile) renders alongside the desktop one. Assertions about
 * the desktop cards are scoped to the desktop wrapper; the phone composition
 * has its own describe block below.
 *
 * @see components/lessons/LessonDetail.tsx
 */
import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import type {
  ContinuityLesson,
  LessonAssignment,
  LessonDetail,
} from '@/lib/services/lesson-detail-queries';

jest.mock('@/lib/config/features', () => ({ SHOW_AI_FEATURES: true }));
jest.mock('@/components/lessons/PostLessonSummaryAI', () => ({
  PostLessonSummaryAI: ({ studentName }: { studentName: string }) => (
    <div data-testid="post-lesson-summary-ai">AI summary for {studentName}</div>
  ),
}));

const updateLessonSongStatusMock = jest.fn();
jest.mock('@/app/dashboard/lessons/actions', () => ({
  updateLessonSongStatus: (...args: unknown[]) => updateLessonSongStatusMock(...args),
}));

import { LessonDetail } from './LessonDetail';
import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { resolveServerTree } from '@/lib/testing/resolve-async-server-components';

/**
 * `LessonDetail` reads `SHOW_AI_FEATURES` as a live property access
 * on the mocked module (`_features.SHOW_AI_FEATURES`) on every render, not a
 * value captured once at import time — Babel's CJS-interop for plain named
 * imports compiles to a direct property read, not a copied binding. So we
 * can flip it per-test by mutating the exact object Jest hands back for this
 * mock via `jest.requireMock`, and it will be picked up on the next render.
 */
const featuresMock = jest.requireMock('@/lib/config/features') as { SHOW_AI_FEATURES: boolean };

afterEach(() => {
  featuresMock.SHOW_AI_FEATURES = true;
  updateLessonSongStatusMock.mockClear();
});

/** The desktop composition (action bar, hero, card grid). */
const desktop = () => within(document.querySelector('.hidden.md\\:block') as HTMLElement);
/** The phone composition. */
const mobile = () => within(document.querySelector('.md\\:hidden') as HTMLElement);

/** A card title like "Songs · 2", whose count sits in its own span. */
const cardTitle = (text: string) => (_: string, el: Element | null) =>
  el?.tagName === 'DIV' &&
  el.textContent?.replace(/\s+/g, ' ').trim() === text &&
  Array.from(el.children).every((c) => c.textContent?.replace(/\s+/g, ' ').trim() !== text);

const makeLesson = (overrides: Partial<LessonDetail> = {}): LessonDetail => ({
  id: 'lesson-1',
  scheduledAt: '2026-07-20T15:00:00.000Z',
  status: 'completed',
  title: 'Fingerstyle basics',
  notes: 'Great progress on the intro riff.',
  lessonTeacherNumber: 12,
  durationMinutes: 45,
  format: 'in_person',
  teacherId: 'teacher-1',
  teacherName: 'Sarah Chen',
  studentId: 'student-1',
  studentName: 'Emma Stone',
  studentEmail: 'emma@strummy.app',
  studentLevel: null,
  studentColor: null,
  teacherColor: null,
  songs: [
    {
      songId: 'song-1',
      title: 'Wonderwall',
      author: 'Oasis',
      key: 'G',
      status: 'started',
      notes: null,
      releaseYear: null,
    },
    {
      songId: 'song-2',
      title: 'Blackbird',
      author: 'The Beatles',
      key: null,
      status: null,
      notes: null,
      releaseYear: null,
    },
  ],
  ...overrides,
});

const makeAssignment = (overrides: Partial<LessonAssignment> = {}): LessonAssignment => ({
  id: 'assignment-1',
  title: 'Practice the intro riff',
  dueDate: '2026-08-01T00:00:00.000Z',
  status: 'not_started',
  ...overrides,
});

const makeContinuity = (overrides: Partial<ContinuityLesson> = {}): ContinuityLesson => ({
  id: 'lesson-0',
  lessonTeacherNumber: 11,
  scheduledAt: '2026-07-13T15:00:00.000Z',
  title: 'Chord transitions',
  notes: null,
  status: 'COMPLETED',
  ...overrides,
});

describe('LessonDetail — content rendering', () => {
  it('renders the lesson title, status, student, and repertoire', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson()} canEdit={false} />);

    const page = desktop();
    expect(page.getByRole('heading', { name: 'Fingerstyle basics' })).toBeInTheDocument();
    expect(page.getAllByText('Completed').length).toBeGreaterThan(0);
    // The avatar initials are aria-hidden, so the link is named by the student.
    expect(page.getByRole('link', { name: 'Emma Stone' })).toHaveAttribute(
      'href',
      '/dashboard/users/student-1'
    );
    expect(page.getByText(cardTitle('Songs · 2'))).toBeInTheDocument();
    expect(page.getByText('Wonderwall')).toBeInTheDocument();
    expect(page.getByText('Blackbird')).toBeInTheDocument();
    expect(page.getByText('Great progress on the intro riff.')).toBeInTheDocument();
  });

  it('falls back to "Untitled lesson" and the student email when data is missing', async () => {
    await renderServerTree(
      <LessonDetail lesson={makeLesson({ title: null, studentName: null })} canEdit={false} />
    );

    expect(desktop().getByRole('heading', { name: 'Untitled lesson' })).toBeInTheDocument();
    expect(mobile().getByRole('heading', { name: 'Untitled lesson' })).toBeInTheDocument();
    const emailLinks = desktop().getAllByRole('link', { name: /emma@strummy\.app$/ });
    expect(emailLinks.length).toBeGreaterThan(0);
    emailLinks.forEach((link) =>
      expect(link).toHaveAttribute('href', '/dashboard/users/student-1')
    );
  });

  it('shows the empty-repertoire message when no songs are attached', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson({ songs: [] })} canEdit={false} />);

    expect(desktop().getByText(cardTitle('Songs · 0'))).toBeInTheDocument();
    expect(desktop().getByText('No songs attached to this lesson yet.')).toBeInTheDocument();
  });

  it('shows the empty-notes message when there are no notes', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson({ notes: null })} canEdit={false} />);

    expect(desktop().getByText('Lesson notes')).toBeInTheDocument();
    expect(desktop().getByText('No notes.')).toBeInTheDocument();
    expect(mobile().getByText('No notes.')).toBeInTheDocument();
  });

  it('only renders the Edit lesson link when canEdit is true', async () => {
    const { rerender } = await renderServerTree(
      <LessonDetail lesson={makeLesson()} canEdit={false} />
    );
    expect(screen.queryByRole('link', { name: /Edit lesson/i })).not.toBeInTheDocument();

    rerender(await resolveServerTree(<LessonDetail lesson={makeLesson()} canEdit={true} />));
    expect(screen.getByRole('link', { name: /Edit lesson/i })).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-1/edit'
    );
  });
});

describe('LessonDetail — lesson info card', () => {
  it('renders the lesson-number badge and sequence line', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson()} canEdit={false} />);

    expect(desktop().getAllByText('Lesson #12').length).toBeGreaterThan(0);
    expect(desktop().getByText('Lesson #12 with Emma')).toBeInTheDocument();
    expect(desktop().getAllByText('Sarah Chen').length).toBeGreaterThan(0);
    // The phone header carries the number too.
    expect(mobile().getByText('Lesson #12')).toBeInTheDocument();
  });

  it('degrades gracefully when there is no lesson number', async () => {
    await renderServerTree(
      <LessonDetail lesson={makeLesson({ lessonTeacherNumber: null })} canEdit={false} />
    );

    expect(screen.queryByText(/Lesson #/)).not.toBeInTheDocument();
    // "With Emma" now appears twice: the sequence fallback (this row degrading)
    // and the always-present Continuity card header.
    expect(screen.getAllByText('With Emma')).toHaveLength(2);
  });
});

describe('LessonDetail — assignments card', () => {
  it('lists homework attached to the lesson', async () => {
    await renderServerTree(
      <LessonDetail
        lesson={makeLesson()}
        canEdit={false}
        assignments={[makeAssignment(), makeAssignment({ id: 'a2', title: 'Metronome drill' })]}
      />
    );

    const page = desktop();
    expect(page.getByText(cardTitle('Assignments · 2'))).toBeInTheDocument();
    expect(page.getByRole('link', { name: 'Practice the intro riff' })).toHaveAttribute(
      'href',
      '/dashboard/assignments/assignment-1'
    );
    expect(page.getByText('Metronome drill')).toBeInTheDocument();
    expect(page.getAllByText(/^Due /).length).toBe(2);
  });

  it('shows an empty state and hides Add when the viewer cannot edit', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson()} canEdit={false} assignments={[]} />);

    expect(screen.getByText('No homework attached to this lesson.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Add/i })).not.toBeInTheDocument();
  });

  it('exposes the Add affordance to editors', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson()} canEdit={true} assignments={[]} />);

    // Carries the lesson's student so the teacher isn't asked to re-pick them.
    expect(screen.getByRole('link', { name: /Add/i })).toHaveAttribute(
      'href',
      '/dashboard/assignments/new?studentId=student-1'
    );
  });
});

describe('LessonDetail — continuity card', () => {
  it('lists previous lessons with the same student', async () => {
    await renderServerTree(
      <LessonDetail
        lesson={makeLesson()}
        canEdit={false}
        continuity={[makeContinuity(), makeContinuity({ id: 'lesson-x', title: 'Barre chords' })]}
      />
    );

    expect(screen.getByText('With Emma')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chord transitions/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-0'
    );
    expect(screen.getByText('Barre chords')).toBeInTheDocument();
  });

  it('shows an empty state when there is no history', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson()} canEdit={false} continuity={[]} />);

    expect(screen.getByText('No previous lessons with Emma.')).toBeInTheDocument();
  });
});

describe('LessonDetail — per-song progress stepper', () => {
  it('lets an editor advance a song stage via the server action', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson()} canEdit={true} />);

    const masterButtons = screen.getAllByLabelText('Set status to Mastered');
    fireEvent.click(masterButtons[0]);

    await waitFor(() =>
      expect(updateLessonSongStatusMock).toHaveBeenCalledWith('lesson-1', 'song-1', 'mastered')
    );
  });

  it('renders the stepper read-only for students (no interactive controls)', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson()} canEdit={false} />);

    expect(screen.queryByLabelText('Set status to Mastered')).not.toBeInTheDocument();
  });
});

describe('LessonDetail — AI summary gating', () => {
  it('renders the AI summary when the feature flag is on, the lesson is completed, and canEdit is true', async () => {
    await renderServerTree(
      <LessonDetail lesson={makeLesson({ status: 'completed' })} canEdit={true} />
    );

    expect(screen.getByTestId('post-lesson-summary-ai')).toBeInTheDocument();
    expect(screen.getByText('AI summary for Emma Stone')).toBeInTheDocument();
  });

  it('hides the AI summary when the feature flag is off', async () => {
    featuresMock.SHOW_AI_FEATURES = false;

    await renderServerTree(
      <LessonDetail lesson={makeLesson({ status: 'completed' })} canEdit={true} />
    );

    expect(screen.queryByTestId('post-lesson-summary-ai')).not.toBeInTheDocument();
  });

  it('hides the AI summary when the viewer cannot edit', async () => {
    await renderServerTree(
      <LessonDetail lesson={makeLesson({ status: 'completed' })} canEdit={false} />
    );

    expect(screen.queryByTestId('post-lesson-summary-ai')).not.toBeInTheDocument();
  });

  it('hides the AI summary when the lesson has not happened yet (not completed)', async () => {
    await renderServerTree(
      <LessonDetail lesson={makeLesson({ status: 'scheduled' })} canEdit={true} />
    );

    expect(screen.queryByTestId('post-lesson-summary-ai')).not.toBeInTheDocument();
  });
});

describe('LessonDetail — phone composition', () => {
  it('shows a back link, the lesson number and an edit shortcut for editors', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson()} canEdit />);

    expect(mobile().getByRole('link', { name: 'Back to lessons' })).toHaveAttribute(
      'href',
      '/dashboard/lessons'
    );
    expect(mobile().getByRole('link', { name: 'Edit lesson' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-1/edit'
    );
    expect(mobile().getByRole('heading', { name: 'Fingerstyle basics' })).toBeInTheDocument();
  });

  it('hides the edit shortcut from viewers who cannot edit', async () => {
    await renderServerTree(<LessonDetail lesson={makeLesson()} canEdit={false} />);
    expect(mobile().queryByRole('link', { name: 'Edit lesson' })).not.toBeInTheDocument();
  });

  it('lists songs, notes and homework as compact sections', async () => {
    await renderServerTree(
      <LessonDetail lesson={makeLesson()} canEdit={false} assignments={[makeAssignment()]} />
    );

    expect(mobile().getByText('Wonderwall').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/songs/song-1'
    );
    expect(mobile().getByText('Great progress on the intro riff.')).toBeInTheDocument();
    expect(mobile().getByText('Practice the intro riff').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/assignments/assignment-1'
    );
  });

  it('drops the songs and homework sections when there are none', async () => {
    await renderServerTree(
      <LessonDetail lesson={makeLesson({ songs: [] })} canEdit={false} assignments={[]} />
    );
    expect(mobile().queryByText('Songs')).not.toBeInTheDocument();
    expect(mobile().queryByText('Assignments')).not.toBeInTheDocument();
    expect(mobile().getByText('Notes')).toBeInTheDocument();
  });
});
