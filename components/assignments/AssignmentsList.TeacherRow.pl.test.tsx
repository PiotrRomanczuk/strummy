/**
 * The teacher's assignment row in Polish: "ostatnio 119 dni temu" and a due
 * date as 27.07, not the English "119d ago" and "07/27".
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { __setMockLocale } from '@/lib/testing/__mocks__/next-intl-server';
import { renderServerTree } from '@/lib/testing/intl-test-utils';
import type { AssignmentRow } from '@/lib/services/assignment-list-params';
import { AssignmentTeacherRow } from './AssignmentsList.TeacherRow';
import { wholeDaysSince } from './assignment-dates.helpers';

const DAY_MS = 86_400_000;

const row = (updatedDaysAgo: number): AssignmentRow => ({
  id: 'assignment-1',
  title: 'Barre chord drill',
  status: 'in_progress',
  effectiveStatus: 'in_progress',
  dueDate: '2026-07-27T12:00:00Z',
  teacherId: 'teacher-1',
  studentId: 'student-1',
  studentName: 'Emma Stone',
  studentEmail: 'emma@example.com',
  studentColor: null,
  songTitle: null,
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: new Date(Date.now() - updatedDaysAgo * DAY_MS - 3_600_000).toISOString(),
  progress: { done: 2, total: 4 },
});

beforeEach(() => __setMockLocale('pl'));
afterEach(() => __setMockLocale('en'));

describe('AssignmentTeacherRow (pl)', () => {
  it.each([
    [119, 'ostatnio 119 dni temu'],
    [1, 'ostatnio 1 dzień temu'],
    [3, 'ostatnio 3 dni temu'],
    [0, 'ostatnio dziś'],
  ])('shows an update %i days ago as "%s"', async (days, expected) => {
    await renderServerTree(<AssignmentTeacherRow row={row(days)} />);
    expect(screen.getByText(`50% · ${expected}`)).toBeInTheDocument();
  });

  it('formats the due date the Polish way', async () => {
    await renderServerTree(<AssignmentTeacherRow row={row(5)} />);
    expect(screen.getByText('Termin 27.07')).toBeInTheDocument();
  });
});

describe('wholeDaysSince', () => {
  const now = new Date('2026-11-24T12:00:00Z');

  it('counts whole days and never goes negative', () => {
    expect(wholeDaysSince('2026-11-20T11:00:00Z', now)).toBe(4);
    expect(wholeDaysSince('2026-11-25T12:00:00Z', now)).toBe(0);
  });

  it('treats an unreadable date as today', () => {
    expect(wholeDaysSince('not a date', now)).toBe(0);
  });
});
