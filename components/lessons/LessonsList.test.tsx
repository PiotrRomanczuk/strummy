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
 * Claude Design pass: the desktop table is a flat list (no Today / This week
 * buckets), and phones get their own composition (LessonsList.Mobile — pill
 * filters and day-grouped cards linking straight to the detail page). jsdom
 * applies no media queries, so both render; table assertions are scoped to the
 * desktop wrapper and the phone ones to the mobile wrapper.
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
  notes: null,
  studentLevel: null,
  studentColor: null,
  teacherColor: null,
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

/** The desktop composition (header, filters, table, panel). */
const desktop = () => within(document.querySelector('.hidden.md\\:block') as HTMLElement);
/** The phone composition (title, pill filters, day-grouped cards). */
const mobile = () => within(document.querySelector('.md\\:hidden') as HTMLElement);

/** The row link, found by accessible name — it has no text of its own. */
const rowLink = (name: RegExp | string) => desktop().getByRole('link', { name });

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
    ['admin', true, true, 'No lessons scheduled across your teachers yet.'],
    ['teacher', true, false, 'No lessons yet. Schedule one to get started.'],
    // Students see the Teacher column, not a Student one.
    ['student', false, true, 'You have no lessons scheduled yet.'],
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

    expect(desktop().getByText(expected)).toBeInTheDocument();
    expect(mobile().getByText(expected)).toBeInTheDocument();
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

    expect(screen.queryByRole('link', { name: 'Lesson' })).not.toBeInTheDocument();
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
    expect(desktop().getByText('3 lessons · sorted by newest first')).toBeInTheDocument();
    expect(mobile().getByText('3 lessons')).toBeInTheDocument();
  });

  it('narrows the count to the active status chips', async () => {
    await renderList({ activeStatuses: ['scheduled', 'cancelled'] });
    expect(desktop().getByText('2 lessons · sorted by newest first')).toBeInTheDocument();
  });

  it('lists rows flat, in the order given, without time buckets', async () => {
    await renderList();
    const names = Array.from(
      (document.querySelector('.hidden.md\\:block') as HTMLElement).querySelectorAll('.ui-row')
    ).map((row) => row.querySelector('a')?.getAttribute('aria-label') ?? row.textContent);
    expect(names.map((n) => (n ?? '').match(/Fingerstyle|Barre|Warm-up/)?.[0])).toEqual([
      'Fingerstyle',
      'Barre',
      'Warm-up',
    ]);
    expect(screen.queryByText('This week')).not.toBeInTheDocument();
  });

  it('offers recurring and new-lesson actions to staff only', async () => {
    await renderList();
    expect(desktop().getByRole('link', { name: 'New lesson' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/new'
    );
    expect(desktop().getByRole('link', { name: 'Recurring…' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/new?repeat=weekly'
    );
  });

  it('hides the create actions from students', async () => {
    await renderList({ canCreate: false, showStudentColumn: false, showTeacherColumn: true });
    expect(screen.queryByRole('link', { name: /New lesson/ })).not.toBeInTheDocument();
    expect(desktop().getByText('Your lessons')).toBeInTheDocument();
  });

  it('renders each row cell scoped to its own row', async () => {
    await renderList();

    const today = rowFor(/Fingerstyle basics/);
    // Status renders in both shapes; assert it exists rather than that it is unique.
    expect(within(today).getAllByText('Scheduled').length).toBeGreaterThan(0);
    expect(within(today).getByText('Emma Stone')).toBeInTheDocument();
    expect(within(today).getByText(/· 45m/)).toBeInTheDocument();

    const week = rowFor(/Barre chords/);
    expect(within(week).getAllByText('In progress').length).toBeGreaterThan(0);
    expect(within(week).getByText('Liam Rossi')).toBeInTheDocument();
    expect(within(week).getByText('#7')).toBeInTheDocument();
    // Singular label when a lesson has exactly one song.
    expect(within(week).getByText('song')).toBeInTheDocument();
  });

  it('shows the first line of the notes and the student level in the row', async () => {
    await renderList({
      lessons: [
        makeLesson({
          id: 'noted',
          title: 'Noted lesson',
          notes: 'Work on the F barre\nThen the bridge',
          studentLevel: 'intermediate',
        }),
      ],
    });
    const row = rowFor(/Noted lesson/);
    expect(within(row).getByText('Work on the F barre')).toBeInTheDocument();
    expect(within(row).queryByText(/Then the bridge/)).not.toBeInTheDocument();
    expect(within(row).getByText('intermediate')).toBeInTheDocument();
  });

  it('shows the teacher column (and no student column) for a student', async () => {
    await renderList({ showStudentColumn: false, showTeacherColumn: true, canCreate: false });
    expect(desktop().getByText('Teacher')).toBeInTheDocument();
    expect(desktop().queryByText('Student')).not.toBeInTheDocument();
    expect(within(rowFor(/Fingerstyle basics/)).getByText('Sarah Chen')).toBeInTheDocument();
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

describe('LessonsList — mobile shape', () => {
  it('groups phone cards by day and links them straight to the detail page', async () => {
    await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[
          makeLesson({ id: 'a', title: 'Alpha' }),
          makeLesson({
            id: 'b',
            title: 'Beta',
            scheduledAt: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        ]}
        breakdown={{ total: 2, byStatus: { scheduled: 2 } }}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
      />
    );

    expect(mobile().getByText('JUL 22')).toBeInTheDocument();
    expect(mobile().getByText('JUL 17')).toBeInTheDocument();
    expect(mobile().getByText('Alpha').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/lessons/a'
    );
    expect(mobile().getByRole('link', { name: '+ New lesson' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/new'
    );
  });

  it('offers single-status pill filters with the active one marked', async () => {
    await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[makeLesson()]}
        breakdown={{ total: 1, byStatus: { completed: 1 } }}
        activeStatuses={['completed']}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
      />
    );

    expect(mobile().getByRole('link', { name: 'All' })).toHaveAttribute(
      'href',
      '/dashboard/lessons'
    );
    const completed = mobile().getByRole('link', { name: 'Completed' });
    expect(completed).toHaveAttribute('aria-current', 'true');
    expect(mobile().getByRole('link', { name: 'Cancelled' })).toHaveAttribute(
      'href',
      '/dashboard/lessons?status=cancelled'
    );
  });

  it('gives every row a trailing block and the split layout', async () => {
    // CSS-gated to phones, so only the classes are assertable here — the shape
    // itself is proven by tests/e2e/student/song-list-mobile.spec.ts's sibling.
    const { container } = await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[makeLesson()]}
        breakdown={{ total: 1, byStatus: { scheduled: 1 } }}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
      />
    );

    const trail = container.querySelector('.ui-row-mobile-trail');
    expect(trail).toBeInTheDocument();
    // Time and status are what a teacher scans a day's lessons for.
    expect(trail).toHaveTextContent('Scheduled');
    expect(container.querySelector('.ui-row-mobile-split')).toBeInTheDocument();
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

  it('makes Date, Lesson and Status sortable', async () => {
    await renderList();
    expect(screen.getByRole('link', { name: 'Date' })).toHaveAttribute(
      'href',
      '/dashboard/lessons?sort=oldest'
    );
    expect(screen.getByRole('link', { name: 'Lesson' })).toHaveAttribute(
      'href',
      '/dashboard/lessons?sort=title_asc'
    );
    expect(screen.getByRole('link', { name: 'Status' })).toHaveAttribute(
      'href',
      '/dashboard/lessons?sort=status_asc'
    );
  });

  it('leaves Student, Songs and Time unsortable — none maps to a lessons column', async () => {
    await renderList();
    for (const name of ['Student', 'Songs', 'Time']) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
      expect(desktop().getByText(name)).toBeInTheDocument();
    }
  });

  it('shows a direction arrow only on the active column, and only once flat', async () => {
    await renderList({ activeSort: 'title_asc', flat: true });
    expect(screen.getByRole('link', { name: /^Lesson/ })).toHaveTextContent('↑');
    expect(screen.getByRole('link', { name: /Status/ })).not.toHaveTextContent('↑');
  });

  it('flips the active column to descending on the next click', async () => {
    await renderList({ activeSort: 'title_asc', flat: true });
    expect(screen.getByRole('link', { name: /^Lesson/ })).toHaveAttribute(
      'href',
      '/dashboard/lessons?sort=title_desc'
    );
  });

  it('shows no arrow at all while grouped', async () => {
    // Grouped mode has no global ordering for a column to claim.
    await renderList({ activeSort: 'title_asc', flat: false });
    expect(screen.getByRole('link', { name: /^Lesson/ })).not.toHaveTextContent('↑');
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

    // The pager renders once per composition (desktop table, phone cards).
    for (const scope of [desktop(), mobile()]) {
      expect(scope.getByRole('link', { name: /Older/ })).toHaveAttribute(
        'href',
        '/dashboard/lessons?status=scheduled&page=3'
      );
      expect(scope.getByRole('link', { name: /Newer/ })).toHaveAttribute(
        'href',
        '/dashboard/lessons?status=scheduled'
      );
    }
  });
});

describe('LessonsList — sort toggle', () => {
  it('flips newest ↔ oldest and enters flat mode', async () => {
    await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[makeLesson()]}
        breakdown={{ total: 1, byStatus: {} }}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
      />
    );

    expect(desktop().getByRole('link', { name: 'Newest first' })).toHaveAttribute(
      'href',
      '/dashboard/lessons?sort=oldest'
    );
  });

  it('offers a year select with every year plus All', async () => {
    await renderServerTree(
      <LessonsList
        {...baseProps}
        lessons={[makeLesson()]}
        breakdown={{ total: 1, byStatus: {} }}
        canCreate
        showStudentColumn
        showTeacherColumn={false}
        activeYear={2025}
      />
    );

    const select = desktop().getByRole('combobox', { name: 'Year' });
    expect(select).toHaveValue('2025');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['All', '2026', '2025', '2024']);
  });
});
