/**
 * LessonsList in Polish — the student's level under their name in the teacher's
 * table is a translated label ("Początkujący"), not the stored "beginner".
 * The server-component mock is switched to pl.json for this file only.
 */
import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { __setMockLocale } from '@/lib/testing/__mocks__/next-intl-server';
import { renderServerTree } from '@/lib/testing/intl-test-utils';
import type { LessonRow } from '@/lib/services/lessons-queries';
import { LessonsList } from './LessonsList';
import { studentLevelLabel } from './lesson-format.helpers';

jest.mock('@/lib/services/lesson-detail-queries', () => ({
  getLessonDetail: jest.fn(async () => ({ songs: [] })),
}));

const lesson = (studentLevel: string | null): LessonRow => ({
  id: 'lesson-1',
  lessonNumber: 3,
  scheduledAt: '2026-07-22T12:00:00.000Z',
  status: 'scheduled',
  title: 'Barre chords',
  durationMinutes: 45,
  teacherId: 'teacher-1',
  studentId: 'student-1',
  studentName: 'Emma Stone',
  studentEmail: 'emma@strummy.app',
  teacherName: 'Sarah Chen',
  teacherEmail: 'sarah@strummy.app',
  songCount: 0,
  songStatuses: [],
  notes: null,
  studentLevel,
  studentColor: null,
  teacherColor: null,
});

const renderList = (studentLevel: string | null) =>
  renderServerTree(
    <LessonsList
      lessons={[lesson(studentLevel)]}
      breakdown={{ total: 1, byStatus: { scheduled: 1 } }}
      activeStatuses={[]}
      activeSort="newest"
      activeYear={undefined}
      flat={false}
      years={[2026]}
      canCreate
      showStudentColumn
      showTeacherColumn={false}
    />
  );

const desktopRow = () => {
  const link = within(document.querySelector('.hidden.md\\:block') as HTMLElement).getByRole(
    'link',
    { name: /Barre chords/ }
  );
  return link.closest('.ui-row') as HTMLElement;
};

beforeEach(() => __setMockLocale('pl'));
afterEach(() => __setMockLocale('en'));

describe('LessonsList (pl)', () => {
  it('shows the student level as a Polish label', async () => {
    await renderList('beginner');
    expect(within(desktopRow()).getByText('Początkujący')).toBeInTheDocument();
    expect(screen.queryByText('beginner')).not.toBeInTheDocument();
  });

  it('shows a level with no message as stored', async () => {
    await renderList('virtuoso');
    expect(within(desktopRow()).getByText('virtuoso')).toBeInTheDocument();
  });
});

describe('studentLevelLabel', () => {
  const tUsers = (key: string) => `[${key}]`;

  it('maps stored levels to their message key, ignoring case', () => {
    expect(studentLevelLabel('Advanced', tUsers)).toBe('[skillLevelAdvanced]');
  });

  it('returns undefined when there is no level', () => {
    expect(studentLevelLabel(null, tUsers)).toBeUndefined();
  });
});
