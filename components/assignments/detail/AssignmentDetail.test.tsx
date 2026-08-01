/**
 * AssignmentDetail — role-aware detail shell backing
 * /dashboard/assignments/[id].
 *
 * Closes the coverage gap flagged in
 * docs/app-blueprint/93-design-mockup-audit.md: the only place this component
 * was referenced was app/dashboard/assignments/page.test.tsx, which fully
 * jest.mock()s it out — so its real render logic (status transitions gated by
 * canManage/canAct, song/lesson links, history, checklist/chord-drill
 * sub-views) was never actually exercised.
 *
 * AssignmentDetail (and its AssignmentSubmitPanel / ChordDrillView children)
 * are async Server Components (they read translations via getTranslations),
 * so renders go through renderServerTree — see @/lib/testing/intl-test-utils.
 *
 * @see components/assignments/detail/AssignmentDetail.tsx
 */
import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { resolveServerTree } from '@/lib/testing/resolve-async-server-components';
import type {
  AssignmentDetail,
  AssignmentHistoryEntry,
} from '@/lib/services/assignment-detail-queries';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ refresh: mockRefresh })),
}));

const mockUpdateAssignmentStatusAction = jest.fn();
jest.mock('@/app/actions/assignment-status', () => ({
  updateAssignmentStatusAction: (...args: unknown[]) => mockUpdateAssignmentStatusAction(...args),
}));

const mockToggleChecklistItemAction = jest.fn();
jest.mock('@/app/actions/assignment-checklist', () => ({
  toggleChecklistItemAction: (...args: unknown[]) => mockToggleChecklistItemAction(...args),
}));

import { AssignmentDetail } from './AssignmentDetail';

/**
 * A due date that stays in the future forever. `deriveEffectiveStatus` turns a
 * past-due open assignment into OVERDUE at read time, so a fixture pinned to a
 * real calendar date is a time bomb: this file asserted "Not started" against a
 * due date of 2026-08-01 and duly went red on the morning of 2026-08-01, on
 * main, with nobody having touched it. Tests that depend on "now" must pick a
 * date that cannot arrive.
 */
const NEVER_DUE = '2099-12-31T00:00:00Z';

const buildAssignment = (overrides: Partial<AssignmentDetail> = {}): AssignmentDetail => ({
  id: 'assignment-1',
  title: 'Barre chord drill',
  description: 'Practice the F major shape up and down the neck.',
  status: 'not_started',
  dueDate: NEVER_DUE,
  teacherId: 'teacher-1',
  studentId: 'student-1',
  studentName: 'Emma Stone',
  studentEmail: 'emma@example.com',
  teacherName: 'Sarah Teacher',
  song: { id: 'song-1', title: 'Wonderwall', author: 'Oasis' },
  lesson: { id: 'lesson-1', scheduledAt: '2026-07-20T10:00:00Z' },
  checklist: [],
  chordDrill: null,
  chordDrillResult: null,
  dailyTargetMinutes: 10,
  submissionType: 'self_report',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  ...overrides,
});

const buildHistory = (): AssignmentHistoryEntry[] => [
  { id: 'h1', changeType: 'created', label: 'Created', changedAt: '2026-07-01T09:00:00Z' },
  {
    id: 'h2',
    changeType: 'status_changed',
    label: 'Status changed to in progress',
    changedAt: '2026-07-05T09:00:00Z',
  },
];

describe('AssignmentDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, status, due date, and a back link to the list', async () => {
    await renderServerTree(
      <AssignmentDetail
        assignment={buildAssignment()}
        canManage={false}
        canAct={false}
        history={[]}
      />
    );

    expect(screen.getByText('Barre chord drill')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText(/due Thursday, December 31, 2099/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Assignments' })).toHaveAttribute(
      'href',
      '/dashboard/assignments'
    );
  });

  it('links to the owning student and shows the brief description', async () => {
    await renderServerTree(
      <AssignmentDetail
        assignment={buildAssignment()}
        canManage={false}
        canAct={false}
        history={[]}
      />
    );

    expect(screen.getByRole('link', { name: 'Emma Stone' })).toHaveAttribute(
      'href',
      '/dashboard/users/student-1'
    );
    expect(
      screen.getByText('Practice the F major shape up and down the neck.')
    ).toBeInTheDocument();
  });

  it('shows a fallback message when there is no description', async () => {
    await renderServerTree(
      <AssignmentDetail
        assignment={buildAssignment({ description: null })}
        canManage={false}
        canAct={false}
        history={[]}
      />
    );

    expect(screen.getByText('No description provided.')).toBeInTheDocument();
  });

  it('links to the linked song and lesson when present', async () => {
    await renderServerTree(
      <AssignmentDetail
        assignment={buildAssignment()}
        canManage={false}
        canAct={false}
        history={[]}
      />
    );

    expect(screen.getByRole('link', { name: /Wonderwall — Oasis/ })).toHaveAttribute(
      'href',
      '/dashboard/songs/song-1'
    );
    expect(screen.getByRole('link', { name: /Monday, July 20, 2026/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-1'
    );
  });

  it('omits the song and lesson links when not set', async () => {
    await renderServerTree(
      <AssignmentDetail
        assignment={buildAssignment({ song: null, lesson: null })}
        canManage={false}
        canAct={false}
        history={[]}
      />
    );

    expect(screen.queryByText(/Song ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lesson ·/)).not.toBeInTheDocument();
  });

  describe('daily target & submission type', () => {
    it('surfaces the daily practice target and submission label', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({ dailyTargetMinutes: 15, submissionType: 'audio' })}
          canManage={false}
          canAct={false}
          history={[]}
        />
      );

      expect(screen.getByText(/Target ·/)).toBeInTheDocument();
      expect(screen.getByText('15 min/day')).toBeInTheDocument();
      expect(screen.getByText(/Submit as ·/)).toBeInTheDocument();
      expect(screen.getByText('Audio recording')).toBeInTheDocument();
    });

    it('omits the target line when there is no daily target, but always shows submit-as', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({ dailyTargetMinutes: null, submissionType: 'note' })}
          canManage={false}
          canAct={false}
          history={[]}
        />
      );

      expect(screen.queryByText(/Target ·/)).not.toBeInTheDocument();
      expect(screen.getByText(/Submit as ·/)).toBeInTheDocument();
      expect(screen.getByText('Note')).toBeInTheDocument();
    });
  });

  describe('teacher/admin management (canManage)', () => {
    it('shows the Edit link when canManage is true', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment()}
          canManage={true}
          canAct={false}
          history={[]}
        />
      );

      expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
        'href',
        '/dashboard/assignments/assignment-1/edit'
      );
    });

    it('hides the Edit link when canManage is false', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment()}
          canManage={false}
          canAct={false}
          history={[]}
        />
      );

      expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('renders the history timeline only when canManage is true and history exists', async () => {
      const { rerender } = await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment()}
          canManage={true}
          canAct={false}
          history={buildHistory()}
        />
      );

      const timeline = screen.getByTestId('assignment-history-timeline');
      expect(within(timeline).getByText('Created')).toBeInTheDocument();
      expect(within(timeline).getByText('Status changed to in progress')).toBeInTheDocument();

      // AssignmentDetail (and its children) are async Server Components, so the
      // tree must be re-resolved before RTL's synchronous rerender.
      rerender(
        await resolveServerTree(
          <AssignmentDetail
            assignment={buildAssignment()}
            canManage={false}
            canAct={false}
            history={buildHistory()}
          />
        )
      );
      expect(screen.queryByTestId('assignment-history-timeline')).not.toBeInTheDocument();
    });
  });

  describe('status actions gated by canAct/canManage', () => {
    it('shows a read-only status line and no action buttons when canAct is false', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({ status: 'not_started' })}
          canManage={true}
          canAct={false}
          history={[]}
        />
      );

      expect(screen.getByText('Status: Not started')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Start working' })).not.toBeInTheDocument();
    });

    it('limits a student (canManage=false) to the student-safe transitions', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({ status: 'not_started' })}
          canManage={false}
          canAct={true}
          history={[]}
        />
      );

      expect(screen.getByRole('button', { name: 'Start working' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel assignment' })).not.toBeInTheDocument();
    });

    it('gives a teacher/admin (canManage=true) the full transition set including cancel', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({ status: 'not_started' })}
          canManage={true}
          canAct={true}
          history={[]}
        />
      );

      expect(screen.getByRole('button', { name: 'Start working' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel assignment' })).toBeInTheDocument();
    });

    it('calls updateAssignmentStatusAction with the assignment id and target status on click', async () => {
      mockUpdateAssignmentStatusAction.mockResolvedValue({
        success: true,
        newStatus: 'in_progress',
      });

      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({ id: 'assignment-42', status: 'not_started' })}
          canManage={false}
          canAct={true}
          history={[]}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Start working' }));

      await waitFor(() =>
        expect(mockUpdateAssignmentStatusAction).toHaveBeenCalledWith(
          'assignment-42',
          'in_progress'
        )
      );
      await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    });
  });

  describe('checklist', () => {
    it('renders checklist items and lets an acting student toggle them', async () => {
      mockToggleChecklistItemAction.mockResolvedValue({ success: true });

      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({
            checklist: [
              { id: 'c1', text: 'Warm up', done: false },
              { id: 'c2', text: 'Play the shape', done: true },
            ],
          })}
          canManage={false}
          canAct={true}
          history={[]}
        />
      );

      expect(screen.getByText('Warm up')).toBeInTheDocument();
      const checkbox = screen.getByRole('checkbox', { name: 'Warm up' });
      expect(checkbox).not.toBeDisabled();

      fireEvent.click(checkbox);

      await waitFor(() =>
        expect(mockToggleChecklistItemAction).toHaveBeenCalledWith('assignment-1', 'c1', true)
      );
    });

    it('disables checklist toggles when canAct is false', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({
            checklist: [{ id: 'c1', text: 'Warm up', done: false }],
          })}
          canManage={true}
          canAct={false}
          history={[]}
        />
      );

      expect(screen.getByRole('checkbox', { name: 'Warm up' })).toBeDisabled();
    });
  });

  describe('chord drill', () => {
    it('shows a "start drill" link for an acting student when there is no result yet', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({
            chordDrill: { chord_ids: ['C', 'G', 'Am'] },
            chordDrillResult: null,
          })}
          canManage={false}
          canAct={true}
          history={[]}
        />
      );

      expect(screen.getByText('Chord drill · 3 chords')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Start chord drill/ })).toHaveAttribute(
        'href',
        '/dashboard/skills/chord-quiz?drill=assignment-1'
      );
    });

    it('shows a waiting message for a non-acting viewer when there is no result yet', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({
            chordDrill: { chord_ids: ['C'] },
            chordDrillResult: null,
          })}
          canManage={true}
          canAct={false}
          history={[]}
        />
      );

      expect(screen.getByText(/Awaiting the student.s result\./)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Start chord drill/ })).not.toBeInTheDocument();
    });

    it('shows the captured score once a result exists', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({
            chordDrill: { chord_ids: ['C', 'G'] },
            chordDrillResult: { score: 2, total: 2, completed_at: '2026-07-15T00:00:00Z' },
          })}
          canManage={false}
          canAct={true}
          history={[]}
        />
      );

      expect(screen.getByText('2/2')).toBeInTheDocument();
    });
  });

  describe('submit panel framing', () => {
    it('frames the status action as a hand-in for an acting student', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({ status: 'not_started' })}
          canManage={false}
          canAct={true}
          history={[]}
        />
      );

      expect(screen.getByText('Your practice')).toBeInTheDocument();
      expect(screen.getByText('Hand it in')).toBeInTheDocument();
      expect(screen.getByText(/mark it complete to send it to your teacher/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start working' })).toBeInTheDocument();
    });

    it('uses neutral status framing (no hand-in copy) for a managing teacher', async () => {
      await renderServerTree(
        <AssignmentDetail
          assignment={buildAssignment({ status: 'not_started' })}
          canManage={true}
          canAct={true}
          history={[]}
        />
      );

      expect(screen.getByText('Update status')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(
        screen.queryByText(/mark it complete to send it to your teacher/i)
      ).not.toBeInTheDocument();
    });
  });
});
