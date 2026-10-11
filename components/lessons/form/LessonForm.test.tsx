/**
 * Component tests: LessonForm — the Claude Design "Schedule a *lesson*." form
 * (FormPageHeader + four sections: Student & time · Location & recurrence ·
 * Songs to cover · Lesson plan notes) backing /dashboard/lessons/new and
 * /dashboard/lessons/[id]/edit.
 *
 * The submit button lives in the page header and targets the form by `form=`
 * id. Date and Time are separate HTML-required inputs, so tests that click
 * submit fill both; the handler's own guards are exercised with
 * `fireEvent.submit`, which bypasses native constraint validation.
 *
 * @see components/lessons/form/LessonForm.tsx
 */
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { LessonForm } from './LessonForm';
import { createLessonAction, updateLessonAction } from '@/app/actions/lesson-edit';
import { generateRecurringLessons } from '@/app/dashboard/lessons/recurring-actions';

jest.mock('@/lib/config/features', () => ({ SHOW_AI_FEATURES: false }));
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock('@/app/actions/lesson-edit', () => ({
  createLessonAction: jest.fn(),
  updateLessonAction: jest.fn(),
}));
jest.mock('@/app/dashboard/lessons/recurring-actions', () => ({
  generateRecurringLessons: jest.fn(),
}));

const students = [
  { id: 's1', name: 'Emma Johnson', email: 'emma@example.com' },
  { id: 's2', name: 'Kuba Nowak', email: null },
];
const songs = [
  { id: 'sg1', title: 'Blackbird', author: 'The Beatles', musicalKey: 'G' },
  { id: 'sg2', title: 'Landslide', author: 'Fleetwood Mac', musicalKey: null },
];

const EDIT_INITIAL = {
  lessonId: 'l1',
  studentId: 's1',
  title: 'Warm-up',
  notes: 'Focus on scales',
  scheduledAt: '2026-04-30T16:00:00.000Z',
  status: 'SCHEDULED',
  durationMinutes: 60,
  format: 'video',
  songIds: ['sg1'],
};

/** A pill is named by the first name alone — the avatar initials are aria-hidden. */
const studentPill = (name: string) =>
  within(screen.getByRole('group', { name: 'Student' })).getByRole('button', {
    name: (accessibleName) => accessibleName === name,
  });

const fillWhen = (date = '2026-04-30', time = '16:00') => {
  fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: date } });
  fireEvent.change(screen.getByLabelText(/^Time/), { target: { value: time } });
};

const submitButton = () => screen.getByRole('button', { name: 'Schedule lesson' });

beforeEach(() => jest.clearAllMocks());

describe('LessonForm', () => {
  it('renders the create-mode header and the four sections', () => {
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);

    expect(
      screen.getByRole('heading', { level: 1, name: /^Schedule a\s+lesson\s*\.$/ })
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Lessons',
      })
    ).toHaveAttribute('href', '/dashboard/lessons');
    expect(screen.getByText('Student & time')).toBeInTheDocument();
    expect(screen.getByText('Location & recurrence')).toBeInTheDocument();
    expect(screen.getByText('Songs to cover')).toBeInTheDocument();
    expect(screen.getByText('Lesson plan notes')).toBeInTheDocument();

    expect(screen.getByLabelText(/^Date/)).toBeRequired();
    expect(screen.getByLabelText(/^Time/)).toBeRequired();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(submitButton()).toBeInTheDocument();
  });

  it('picks the student from avatar pills, one at a time', () => {
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);

    expect(studentPill('Emma')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(studentPill('Emma'));
    expect(studentPill('Emma')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(studentPill('Kuba'));
    expect(studentPill('Kuba')).toHaveAttribute('aria-pressed', 'true');
    expect(studentPill('Emma')).toHaveAttribute('aria-pressed', 'false');
  });

  it('pre-selects the student when arriving from their profile', () => {
    renderWithIntl(
      <LessonForm mode="create" students={students} songs={songs} defaultStudentId="s2" />
    );
    expect(studentPill('Kuba')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the invite-by-email field once the new-student pill is picked', () => {
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);
    expect(screen.queryByPlaceholderText('student@email.com')).not.toBeInTheDocument();

    fireEvent.click(studentPill('+ New student by email…'));
    expect(screen.getByPlaceholderText('student@email.com')).toBeInTheDocument();
  });

  it('renders the repeat-weekly toggle only in create mode', () => {
    const { unmount } = renderWithIntl(
      <LessonForm mode="create" students={students} songs={songs} />
    );
    const toggle = screen.getByTestId('lesson-repeat-weekly-checkbox');
    expect(toggle).toHaveAttribute('role', 'switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('lesson-repeat-weeks-select')).toBeInTheDocument();
    unmount();

    renderWithIntl(
      <LessonForm mode="edit" students={students} songs={songs} initial={EDIT_INITIAL} />
    );
    expect(screen.queryByTestId('lesson-repeat-weekly-checkbox')).not.toBeInTheDocument();
    // Edit mode puts the status select in the recurrence slot.
    expect(screen.getByLabelText('Status')).toHaveValue('SCHEDULED');
  });

  it('requires a date/time before submitting', async () => {
    const { container } = renderWithIntl(
      <LessonForm mode="create" students={students} songs={songs} />
    );
    fireEvent.submit(container.querySelector('form')!);

    expect(await screen.findByText('Pick a date and time for the lesson.')).toBeInTheDocument();
    expect(createLessonAction).not.toHaveBeenCalled();
  });

  it('rejects a half-filled date/time instead of crashing on an invalid date', async () => {
    const { container } = renderWithIntl(
      <LessonForm mode="create" students={students} songs={songs} />
    );
    fireEvent.click(studentPill('Emma'));
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: '2026-04-30' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(await screen.findByText('Pick a date and time for the lesson.')).toBeInTheDocument();
    expect(createLessonAction).not.toHaveBeenCalled();
  });

  it('requires a student (or invite email) on create', async () => {
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);
    fillWhen();
    fireEvent.click(submitButton());

    expect(await screen.findByText('Choose a student or add one by email.')).toBeInTheDocument();
    expect(createLessonAction).not.toHaveBeenCalled();
  });

  it('submits create lessons and redirects to the new lesson', async () => {
    (createLessonAction as jest.Mock).mockResolvedValue({ lessonId: 'new-lesson-id' });
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Fingerpicking' } });
    fillWhen();
    fireEvent.click(submitButton());

    await waitFor(() => expect(createLessonAction).toHaveBeenCalled());
    expect(createLessonAction).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 's1',
        title: 'Fingerpicking',
        scheduledAt: new Date('2026-04-30T16:00').toISOString(),
      })
    );
    expect(mockPush).toHaveBeenCalledWith('/dashboard/lessons/new-lesson-id');
  });

  it('invites a new student by email when that pill is chosen', async () => {
    (createLessonAction as jest.Mock).mockResolvedValue({ lessonId: 'new-lesson-id' });
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('+ New student by email…'));
    fireEvent.change(screen.getByPlaceholderText('student@email.com'), {
      target: { value: 'new@student.dev' },
    });
    fillWhen();
    fireEvent.click(submitButton());

    await waitFor(() => expect(createLessonAction).toHaveBeenCalled());
    expect(createLessonAction).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: undefined, studentEmail: 'new@student.dev' })
    );
  });

  it('submits songs toggled on in the "Songs to cover" cards', async () => {
    (createLessonAction as jest.Mock).mockResolvedValue({ lessonId: 'new-lesson-id' });
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fillWhen();

    const landslide = screen.getByRole('checkbox', { name: /Landslide/ });
    expect(landslide).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(landslide);
    expect(landslide).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: /Blackbird/ })).toHaveTextContent(
      'The Beatles · G'
    );

    fireEvent.click(submitButton());

    await waitFor(() => expect(createLessonAction).toHaveBeenCalled());
    expect(createLessonAction).toHaveBeenCalledWith(expect.objectContaining({ songIds: ['sg2'] }));
  });

  it('adds a search box once the library outgrows the card grid', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `song-${i}`,
      title: i === 11 ? 'Wonderwall' : `Song ${i}`,
      author: i === 11 ? 'Oasis' : null,
      musicalKey: null,
    }));
    renderWithIntl(<LessonForm mode="create" students={students} songs={many} />);

    // Ten cards, then the filter narrows the rest of the library.
    expect(screen.getAllByTestId('lesson-song-card')).toHaveLength(10);
    fireEvent.change(screen.getByLabelText('Search 12 songs by title or artist…'), {
      target: { value: 'oasis' },
    });
    expect(screen.getAllByTestId('lesson-song-card')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: /Wonderwall/ })).toBeInTheDocument();
  });

  it('shows the empty-library hint when there are no songs', () => {
    renderWithIntl(<LessonForm mode="create" students={students} songs={[]} />);
    expect(
      screen.getByText('No songs in the library yet — add one from Songs first.')
    ).toBeInTheDocument();
  });

  it('surfaces a server error without navigating', async () => {
    (createLessonAction as jest.Mock).mockResolvedValue({ error: 'Something went wrong.' });
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fillWhen();
    fireEvent.click(submitButton());

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('creates a weekly series through generateRecurringLessons', async () => {
    (generateRecurringLessons as jest.Mock).mockResolvedValue({ success: true, created: 4 });
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fillWhen();
    fireEvent.click(screen.getByTestId('lesson-repeat-weekly-checkbox'));
    fireEvent.click(submitButton());

    await waitFor(() => expect(generateRecurringLessons).toHaveBeenCalled());
    expect(createLessonAction).not.toHaveBeenCalled();
  });

  it('edit mode pre-fills fields and submits via updateLessonAction', async () => {
    (updateLessonAction as jest.Mock).mockResolvedValue({ lessonId: 'l1' });
    renderWithIntl(
      <LessonForm mode="edit" students={students} songs={songs} initial={EDIT_INITIAL} />
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /^Edit\s+lesson\s*\.$/ })
    ).toBeInTheDocument();
    // No student picker on edit — the lesson's student is fixed.
    expect(screen.queryByRole('group', { name: 'Student' })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Warm-up')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Focus on scales')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Blackbird/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/dashboard/lessons/l1'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateLessonAction).toHaveBeenCalledWith('l1', expect.anything()));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/lessons/l1');
  });

  it('renders the duration select and format toggle in create mode', () => {
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);

    const duration = screen.getByLabelText('Duration') as HTMLSelectElement;
    // Defaults to 45 min per the mockup.
    expect(duration.value).toBe('45');
    expect(
      within(duration)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['30 min', '45 min', '60 min']);

    // In-person is the default-selected format toggle.
    const inPerson = screen.getByRole('button', { name: 'In-person' });
    expect(inPerson).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Video call' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('submits the chosen duration and format on create', async () => {
    (createLessonAction as jest.Mock).mockResolvedValue({ lessonId: 'new-lesson-id' });
    renderWithIntl(<LessonForm mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fillWhen();
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Video call' }));
    fireEvent.click(submitButton());

    await waitFor(() => expect(createLessonAction).toHaveBeenCalled());
    expect(createLessonAction).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 60, format: 'video' })
    );
  });

  it('seeds the duration and format from initial on edit', () => {
    renderWithIntl(
      <LessonForm
        mode="edit"
        students={students}
        songs={songs}
        initial={{ ...EDIT_INITIAL, durationMinutes: 30, notes: null, songIds: [] }}
      />
    );

    expect((screen.getByLabelText('Duration') as HTMLSelectElement).value).toBe('30');
    expect(screen.getByRole('button', { name: 'Video call' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
