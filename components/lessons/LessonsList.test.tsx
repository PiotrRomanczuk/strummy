/**
 * Component tests: LessonsList — the shell backing /dashboard/lessons for
 * admin, teacher, and student roles (role is expressed via the
 * showStudentColumn / showTeacherColumn boolean props, not a single `role`
 * prop — see app/dashboard/lessons/page.tsx for the mapping).
 *
 * Rewritten for the list-table standard
 * (docs/app-blueprint/reference/LIST_TABLE_PATTERN.md). The row is no longer a
 * `<Link>` wrapping its cells — it is a grid of cells with one *empty*
 * stretched link behind them, so `within(link)` now matches nothing. Rows are
 * located by the link's accessible name and then scoped via `.ui-row`.
 *
 * @see components/lessons/LessonsList.tsx
 */
import React from 'react';
import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LessonsList } from './LessonsList';
import { renderServerTree } from '@/lib/testing/intl-test-utils';
import type { LessonRow, LessonsBreakdown } from '@/lib/services/lessons-queries';

// The panel loads song titles through the detail query; the list itself only
// carries a count. Stubbed so these stay pure component tests.
jest.mock('@/lib/services/lesson-detail-queries', () => ({
  getLessonDetail: jest.fn(async () => ({
    songs: [{ songId: 's1', title: 'Blackbird', author: null, key: null, status: 'to_learn' }],
  })),
}));

const NOW = new Date('2026-07-22T12:00:00.000Z');

const makeLesson = (overrides: Partial<LessonRow> = {}): LessonRow => ({
  id: 'lesson-1',
  lessonNumber: 12,
  scheduledAt: NOW.toISOString(),
  status: 'scheduled',
  title: 'Fingerstyle basics',
  durationMinutes: 45,
  teacherId: 'teacher-1',
  studentId: 'student-1',
  studentName: 'Emma Stone',
  studentEmail: 'emma@strummy.app',
  teacherName: 'Sarah Chen',
  teacherEmail: 'sarah@strummy.app',
  songCount: 0,
  songStatuses: [],
  ...overrides,
});

const emptyBreakdown: LessonsBreakdown = { total: 0, byStatus: {} };

const baseProps = {
  breakdown: emptyBreakdown,
  activeStatuses: [] as string[],
  activeSort: 'newest' as const,
  activeYear: undefined,
  flat: false,
  years: [2026, 2025, 2024],
};

/** The row link, found by accessible name — it has no text of its own. */
const rowLink = (name: RegExp | string) => screen.getByRole('link', { name });

/** The row container holding the cells, for scoped assertions. */
const rowFor = (name: RegExp | string): HTMLElement => {
  const el = rowLink(name).closest('.ui-row');
  if (!el) throw new Error(`no .ui-row ancestor for row "${name}"`);
  return el as HTMLElement;
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('LessonsList — empty states by role', () => {
  it.each([
    ['admin', true, true, /no lessons/i],
    ['teacher', true, false, /no lessons/i],
    ['student', false, false, /no lessons/i],
  ])('shows an empty message for %s', async (_role, showStudent, showTeacher, expected) => {
    await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[]}
        canCreate={showStudent}
        showStudentColumn={showStudent}
        showTeacherColumn={showTeacher}
      />
    );

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('renders no column headers when there is nothing to label', async () => {
    await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[]}
        canCreate={false}
        showStudentColumn
        showTeacherColumn={false}
      />
    );

    expect(screen.queryByRole('link', { name: 'Title' })).not.toBeInTheDocument();
  });
});

describe('LessonsList — rows', () => {
  const lessons: LessonRow[] = [
    makeLesson({
      id: 'today',
      scheduledAt: new Date(NOW.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      title: 'Fingerstyle basics',
      status: 'scheduled',
      studentName: 'Emma Stone',
    }),
    makeLesson({
      id: 'this-week',
      scheduledAt: new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      title: 'Barre chords',
      status: 'in_progress',
      studentName: 'Liam Rossi',
      lessonNumber: 7,
      songCount: 1,
      songStatuses: ['to_learn'],
    }),
    makeLesson({
      id: 'past',
      scheduledAt: new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      title: 'Warm-up drills',
      status: 'cancelled',
      studentName: 'Noah Diaz',
    }),
  ];

  const renderList = (props: Partial<React.ComponentProps<typeof LessonsList>> = {}) =>
    renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={lessons}
        breakdown={{
          total: 3,
          byStatus: { scheduled: 1, in_progress: 1, cancelled: 1 },
        }}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
        {...props}
      />
    );

  it('reports the matching count from the breakdown, not the rows on screen', async () => {
    await renderList();
    expect(screen.getByText(/3 lessons/)).toBeInTheDocument();
  });

  it('groups rows into time buckets in timeline order', async () => {
    await renderList();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('Past')).toBeInTheDocument();
  });

  it('renders each row cell scoped to its own row', async () => {
    await renderList();

    const today = rowFor(/Fingerstyle basics/);
    expect(within(today).getByText('Scheduled')).toBeInTheDocument();
    expect(within(today).getByText('Emma Stone')).toBeInTheDocument();
    expect(within(today).getByText(/45 min/)).toBeInTheDocument();

    const week = rowFor(/Barre chords/);
    expect(within(week).getByText('In progress')).toBeInTheDocument();
    expect(within(week).getByText('Liam Rossi')).toBeInTheDocument();
    expect(within(week).getByText('#7')).toBeInTheDocument();
    // Singular label when a lesson has exactly one song.
    expect(within(week).getByText('song')).toBeInTheDocument();
  });

  it('gives the row link an accessible name that identifies the lesson', async () => {
    // Two lessons can share a title, so the number and date are what
    // disambiguate — for a screen reader and for every test below.
    await renderList();
    expect(rowLink(/^#7 Barre chords — /)).toBeInTheDocument();
  });

  it('points the row link at ?selected= rather than the detail route', async () => {
    await renderList();
    expect(rowLink(/Fingerstyle basics/)).toHaveAttribute(
      'href',
      '/dashboard/lessons?selected=today'
    );
  });

  it('links the open row back to itself with selected cleared, so a click closes it', async () => {
    await renderList({ selected: 'today' });
    expect(rowLink(/Fingerstyle basics/)).toHaveAttribute('href', '/dashboard/lessons');
  });

  it('marks the selected row with aria-current and leaves the others unmarked', async () => {
    await renderList({ selected: 'today' });
    expect(rowLink(/Fingerstyle basics/)).toHaveAttribute('aria-current', 'true');
    expect(rowLink(/Barre chords/)).not.toHaveAttribute('aria-current');
  });
});

describe('LessonsList — detail panel', () => {
  const lessons = [makeLesson({ id: 'lesson-1', title: 'Fingerstyle basics' })];

  const renderWith = (selected?: string) =>
    renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={lessons}
        breakdown={{ total: 1, byStatus: { scheduled: 1 } }}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
        selected={selected}
      />
    );

  it('stays closed when nothing is selected', async () => {
    await renderWith(undefined);
    expect(screen.queryByRole('complementary', { name: /Lesson detail/ })).not.toBeInTheDocument();
  });

  it('opens, names itself after the lesson, and offers both exits', async () => {
    await renderWith('lesson-1');

    const panel = screen.getByRole('complementary', {
      name: 'Lesson detail: Fingerstyle basics',
    });
    expect(within(panel).getByRole('link', { name: 'Open full page' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/lesson-1'
    );
    // Close clears `selected` and nothing else.
    expect(within(panel).getByRole('link', { name: 'Close' })).toHaveAttribute(
      'href',
      '/dashboard/lessons'
    );
  });

  it('lists the songs attached to the lesson', async () => {
    await renderWith('lesson-1');
    const panel = screen.getByRole('complementary', { name: /Lesson detail/ });
    expect(within(panel).getByText('Blackbird')).toBeInTheDocument();
  });

  it('ignores a selected id that is not on this page', async () => {
    await renderWith('not-here');
    expect(screen.queryByRole('complementary', { name: /Lesson detail/ })).not.toBeInTheDocument();
  });
});

describe('LessonsList — sortable column headers', () => {
  const renderList = (props: Partial<React.ComponentProps<typeof LessonsList>> = {}) =>
    renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[makeLesson()]}
        breakdown={{ total: 1, byStatus: { scheduled: 1 } }}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
        {...props}
      />
    );

  it('makes Date, Title and Status sortable', async () => {
    await renderList();
    expect(screen.getByRole('link', { name: 'Date' })).toHaveAttribute(
      'href',
      '/dashboard/lessons?sort=oldest'
    );
    expect(screen.getByRole('link', { name: 'Title' })).toHaveAttribute(
      'href',
      '/dashboard/lessons?sort=title_asc'
    );
    expect(screen.getByRole('link', { name: 'Status' })).toHaveAttribute(
      'href',
      '/dashboard/lessons?sort=status_asc'
    );
  });

  it('leaves Student unsortable — the query cannot order by a joined name', async () => {
    await renderList();
    expect(screen.queryByRole('link', { name: 'Student' })).not.toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('shows a direction arrow only on the active column, and only once flat', async () => {
    await renderList({ activeSort: 'title_asc', flat: true });
    expect(screen.getByRole('link', { name: /Title/ })).toHaveTextContent('↑');
    expect(screen.getByRole('link', { name: /Status/ })).not.toHaveTextContent('↑');
  });

  it('flips the active column to descending on the next click', async () => {
    await renderList({ activeSort: 'title_asc', flat: true });
    expect(screen.getByRole('link', { name: /Title/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons?sort=title_desc'
    );
  });

  it('shows no arrow at all while grouped', async () => {
    // Grouped mode has no global ordering for a column to claim.
    await renderList({ activeSort: 'title_asc', flat: false });
    expect(screen.getByRole('link', { name: /Title/ })).not.toHaveTextContent('↑');
  });
});

describe('LessonsList — status filter chips', () => {
  it('links each chip through buildHref: the active one clears, the others add', async () => {
    // Asserted on hrefs rather than by role: the chips live inside
    // CollapsibleFilterBar, whose collapsed/expanded state is its own concern
    // and not part of the list-table contract. What matters here is that every
    // chip routes through `buildHref` and composes with the active filter.
    const { container } = await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[makeLesson()]}
        breakdown={{ total: 1, byStatus: { scheduled: 1, completed: 3 } }}
        activeStatuses={['scheduled']}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
      />
    );

    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    // Clicking the active chip clears it back to the unfiltered list.
    expect(hrefs).toContain('/dashboard/lessons');
    // Clicking an inactive one adds it to the active set.
    expect(hrefs).toContain('/dashboard/lessons?status=scheduled%2Ccompleted');
  });

  it('carries the active status into the sort and row links', async () => {
    const { container } = await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[makeLesson({ id: 'lesson-1' })]}
        breakdown={{ total: 1, byStatus: { scheduled: 1 } }}
        activeStatuses={['scheduled']}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
      />
    );

    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/dashboard/lessons?status=scheduled&sort=title_asc');
    expect(hrefs).toContain('/dashboard/lessons?status=scheduled&selected=lesson-1');
  });
});

describe('LessonsList — pagination', () => {
  const lessons = [makeLesson()];

  it('renders nothing when there is only one page', async () => {
    await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={lessons}
        breakdown={{ total: 1, byStatus: {} }}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
        activePage={1}
        pageCount={1}
      />
    );

    expect(screen.queryByRole('link', { name: /Older/ })).not.toBeInTheDocument();
  });

  it('keeps every active filter in the page links', async () => {
    await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={lessons}
        breakdown={{ total: 90, byStatus: {} }}
        activeStatuses={['scheduled']}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
        activePage={2}
        pageCount={3}
      />
    );

    expect(screen.getByRole('link', { name: /Older/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons?status=scheduled&page=3'
    );
    expect(screen.getByRole('link', { name: /Newer/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons?status=scheduled'
    );
  });
});

describe('LessonsList — grouped vs flat', () => {
  const lessons = [
    makeLesson({ id: 'a', title: 'Alpha' }),
    makeLesson({
      id: 'b',
      title: 'Beta',
      scheduledAt: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  ];

  const renderWith = (flat: boolean) =>
    renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={lessons}
        breakdown={{ total: 2, byStatus: {} }}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
        flat={flat}
        activeSort="title_asc"
      />
    );

  it('shows time-bucket headers when grouped', async () => {
    await renderWith(false);
    expect(screen.getByText('Past')).toBeInTheDocument();
  });

  it('drops the buckets once a sort is applied', async () => {
    await renderWith(true);
    expect(screen.queryByText('Past')).not.toBeInTheDocument();
    expect(rowLink(/Alpha/)).toBeInTheDocument();
    expect(rowLink(/Beta/)).toBeInTheDocument();
  });
});
