/**
 * AssignmentsList — role-aware shell backing /dashboard/assignments.
 *
 * Claude Design pass:
 *  - teacher/admin: header with open/overdue/completed counts and "New
 *    assignment", then a board (Open · Completed · Cancelled tabs over
 *    AssignmentTeacherRow rows) beside the Quick assign card;
 *  - student: master-detail — the "From your teacher" inbox on the left
 *    (StudentAssignmentsList) and the open assignment on the right
 *    (StudentAssignmentPane).
 *
 * The student pane and Quick assign fetch/act on their own and have their own
 * concerns, so both are stubbed here: this suite asserts what the shell decides
 * (which assignment is open, when Quick assign mounts) and what the board and
 * inbox render.
 *
 * AssignmentsList and its children are async Server Components using
 * getTranslations, so renders go through renderServerTree.
 *
 * @see components/assignments/AssignmentsList.tsx
 */
import React from 'react';
import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { AssignmentsList } from './AssignmentsList';
import type { AssignmentListCounts, AssignmentRow } from '@/lib/services/assignment-list-params';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() })),
  usePathname: jest.fn(() => '/dashboard/assignments'),
}));

jest.mock('@/components/assignments/student/StudentAssignments.Pane', () => ({
  StudentAssignmentPane: ({ assignmentId }: { assignmentId: string }) => (
    <div data-testid="student-assignment-pane" data-assignment-id={assignmentId} />
  ),
}));

jest.mock('@/components/assignments/list/QuickAssign', () => ({
  QuickAssign: ({ students, songs }: { students: unknown[]; songs: unknown[] }) => (
    <div data-testid="quick-assign" data-students={students.length} data-songs={songs.length} />
  ),
}));

const buildRow = (overrides: Partial<AssignmentRow> = {}): AssignmentRow => ({
  id: 'assignment-1',
  title: 'Barre chord drill',
  status: 'in_progress',
  effectiveStatus: 'in_progress',
  dueDate: '2026-08-01T00:00:00Z',
  teacherId: 'teacher-1',
  studentId: 'student-1',
  studentName: 'Emma Stone',
  studentEmail: 'emma@example.com',
  studentColor: null,
  songTitle: null,
  description: null,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  progress: { done: 2, total: 4 },
  ...overrides,
});

const emptyCounts = (): AssignmentListCounts => ({
  all: 0,
  not_started: 0,
  in_progress: 0,
  completed: 0,
  overdue: 0,
  cancelled: 0,
});

const buildCounts = (overrides: Partial<AssignmentListCounts> = {}): AssignmentListCounts => ({
  ...emptyCounts(),
  ...overrides,
});

const baseProps = { dir: 'asc' as const, page: 1, totalPages: 1 };

describe('AssignmentsList', () => {
  describe('teacher view (asStudent=false)', () => {
    it('renders the "Teaching" header with open / overdue / completed counts', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={[buildRow()]}
          counts={buildCounts({ all: 6, not_started: 1, in_progress: 2, overdue: 1, completed: 2 })}
          asStudent={false}
        />
      );

      expect(screen.getByText('Teaching')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Assignments' })).toBeInTheDocument();
      expect(
        screen.getByText(
          (_, el) =>
            el?.tagName === 'DIV' &&
            el.textContent?.replace(/\s+/g, ' ').trim() === '4 open · 1 overdue · 2 completed'
        )
      ).toBeInTheDocument();
    });

    it('shows the New assignment link only when canCreate is true', async () => {
      const { unmount } = await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={[buildRow()]}
          counts={buildCounts({ all: 1 })}
          asStudent={false}
          canCreate
        />
      );
      expect(screen.getByRole('link', { name: 'New assignment' })).toHaveAttribute(
        'href',
        '/dashboard/assignments/new'
      );
      unmount();

      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={[buildRow()]}
          counts={buildCounts({ all: 1 })}
          asStudent={false}
        />
      );
      expect(screen.queryByRole('link', { name: 'New assignment' })).not.toBeInTheDocument();
    });

    it('renders Open / Completed / Cancelled tabs with counts, marking the active one', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={[buildRow()]}
          counts={buildCounts({ not_started: 1, in_progress: 1, overdue: 1, completed: 4 })}
          asStudent={false}
          tab="completed"
        />
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs.map((tab) => tab.textContent)).toEqual([
        'Open · 3',
        'Completed · 4',
        'Cancelled · 0',
      ]);
      expect(tabs[0]).toHaveAttribute('href', '/dashboard/assignments');
      expect(tabs[1]).toHaveAttribute('href', '/dashboard/assignments?tab=completed');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    });

    it('renders each row as who · what with the brief, progress, due date and status', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={[
            buildRow({
              songTitle: 'Wonderwall',
              description: 'Clean chord changes\nThen add the strum',
            }),
          ]}
          counts={buildCounts({ all: 1, in_progress: 1 })}
          asStudent={false}
        />
      );

      const row = screen.getByRole('link', { name: 'Emma · Wonderwall' });
      expect(row).toHaveAttribute('href', '/dashboard/assignments/assignment-1');
      expect(within(row).getByText('Clean chord changes')).toBeInTheDocument();
      expect(within(row).queryByText(/Then add the strum/)).not.toBeInTheDocument();
      expect(within(row).getByText(/^50% · last /)).toBeInTheDocument();
      expect(within(row).getByText('Due 08/01')).toBeInTheDocument();
      expect(within(row).getByText('In progress')).toBeInTheDocument();
    });

    it('falls back to the title, and to the title as the brief, when there is no song', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={[buildRow({ dueDate: null, progress: { done: 0, total: 0 } })]}
          counts={buildCounts({ all: 1, in_progress: 1 })}
          asStudent={false}
        />
      );

      const row = screen.getByRole('link', { name: 'Emma · Barre chord drill' });
      expect(within(row).getByText('—')).toBeInTheDocument();
      // No checklist: an in-progress row reads as half done.
      expect(within(row).getByText(/^50% · /)).toBeInTheDocument();
    });

    it('shows the empty-bucket copy when the tab has no rows', async () => {
      await renderServerTree(
        <AssignmentsList {...baseProps} rows={[]} counts={emptyCounts()} asStudent={false} />
      );

      expect(screen.getByText('Nothing in this bucket right now.')).toBeInTheDocument();
    });

    it('mounts Quick assign for creators who have students and songs to pick from', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={[]}
          counts={emptyCounts()}
          asStudent={false}
          canCreate
          students={[{ id: 's1', name: 'Emma Stone', email: null }]}
          songs={[{ id: 'g1', title: 'Wonderwall', author: 'Oasis' }]}
        />
      );

      const quick = screen.getByTestId('quick-assign');
      expect(quick).toHaveAttribute('data-students', '1');
      expect(quick).toHaveAttribute('data-songs', '1');
    });

    it('leaves Quick assign out without create rights', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={[]}
          counts={emptyCounts()}
          asStudent={false}
          students={[{ id: 's1', name: 'Emma Stone', email: null }]}
          songs={[{ id: 'g1', title: 'Wonderwall', author: 'Oasis' }]}
        />
      );

      expect(screen.queryByTestId('quick-assign')).not.toBeInTheDocument();
    });
  });

  describe('student view (asStudent=true)', () => {
    const studentRows = () => [
      buildRow({
        id: 'done',
        title: 'Old drill',
        status: 'completed',
        effectiveStatus: 'completed',
      }),
      buildRow({ id: 'open', title: 'Barre chord drill', songTitle: 'Wonderwall' }),
    ];

    it('renders the "From your teacher" inbox with the active count', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={studentRows()}
          counts={buildCounts({ all: 2, in_progress: 1, completed: 1 })}
          asStudent
        />
      );

      expect(screen.getByText('From your teacher')).toBeInTheDocument();
      expect(screen.getByText('1 active')).toBeInTheDocument();
      // A student never sees whose assignment it is — it is theirs.
      expect(screen.queryByText('Emma Stone')).not.toBeInTheDocument();
    });

    it('opens the first unfinished assignment when nothing is selected', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={studentRows()}
          counts={buildCounts({ all: 2 })}
          asStudent
        />
      );

      expect(screen.getByTestId('student-assignment-pane')).toHaveAttribute(
        'data-assignment-id',
        'open'
      );
      const openCard = screen.getByText('Wonderwall').closest('a');
      expect(openCard).toHaveAttribute('aria-current', 'true');
      expect(openCard).toHaveAttribute('href', '/dashboard/assignments?selected=open');
    });

    it('opens the selected assignment from the URL', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={studentRows()}
          counts={buildCounts({ all: 2 })}
          asStudent
          selected="done"
        />
      );

      expect(screen.getByTestId('student-assignment-pane')).toHaveAttribute(
        'data-assignment-id',
        'done'
      );
      expect(screen.getByText('Old drill').closest('a')).toHaveAttribute('aria-current', 'true');
    });

    it('renders the status label and due date on each card', async () => {
      await renderServerTree(
        <AssignmentsList
          {...baseProps}
          rows={studentRows()}
          counts={buildCounts({ all: 2 })}
          asStudent
        />
      );

      const doneCard = screen.getByText('Old drill').closest('a') as HTMLElement;
      expect(within(doneCard).getByText('Completed')).toBeInTheDocument();
      expect(within(doneCard).getByText('✓')).toBeInTheDocument();
      const openCard = screen.getByText('Wonderwall').closest('a') as HTMLElement;
      expect(within(openCard).getByText('Due 08/01')).toBeInTheDocument();
    });

    it('shows the empty inbox copy and a pick-one prompt when there are no rows', async () => {
      await renderServerTree(
        <AssignmentsList {...baseProps} rows={[]} counts={emptyCounts()} asStudent />
      );

      expect(screen.getByText('No assignments on your desk. Enjoy the quiet.')).toBeInTheDocument();
      expect(screen.getByText('Pick an assignment on the left.')).toBeInTheDocument();
      expect(screen.queryByTestId('student-assignment-pane')).not.toBeInTheDocument();
    });
  });
});
