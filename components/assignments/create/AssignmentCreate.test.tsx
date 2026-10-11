/**
 * Component tests for AssignmentCreate — the Claude Design "New *assignment*."
 * form: student pills (one or more students), song / drill + task, due date &
 * daily target, submission type, and a collapsed "extras" section (custom
 * title, checklist, chord drill, templates). Also verifies AssignmentAI is
 * wired into the form. Mocks the server actions + useAIStream.
 *
 * AssignmentAI is hidden in production behind SHOW_AI_FEATURES; this suite
 * forces the flag on so the wiring guard stays meaningful for when the feature
 * is re-enabled.
 */
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { AssignmentCreate } from '@/components/assignments/create/AssignmentCreate';
import { createAssignmentAction, updateAssignmentAction } from '@/app/actions/assignment-edit';

jest.mock('@/lib/config/features', () => ({ SHOW_AI_FEATURES: true }));
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock('@/app/actions/assignment-edit', () => ({
  createAssignmentAction: jest.fn(),
  updateAssignmentAction: jest.fn(),
}));
jest.mock('@/app/actions/ai', () => ({ generateAssignmentStream: jest.fn() }));
jest.mock('@/app/actions/assignment-templates', () => ({ saveAssignmentAsTemplate: jest.fn() }));

const mockStart = jest.fn();
jest.mock('@/hooks/useAIStream', () => ({
  useAIStream: jest.fn(() => ({
    status: 'idle',
    content: '',
    tokenCount: 0,
    error: null,
    reasoning: undefined,
    isStreaming: false,
    isError: false,
    start: mockStart,
    cancel: jest.fn(),
    reset: jest.fn(),
  })),
}));

const students = [
  { id: 's1', name: 'Emma Stone', email: null },
  { id: 's2', name: 'Liam Fox', email: 'liam@example.com' },
];
const songs = [{ id: 'g1', title: 'Wonderwall', author: 'Oasis' }];

/** A pill is named by the first name alone — the avatar initials are aria-hidden. */
const studentPill = (name: string) =>
  within(screen.getByRole('group', { name: 'Student' })).getByRole('button', {
    name: (accessibleName) => accessibleName === name,
  });

const sendButton = () => screen.getByRole('button', { name: 'Send assignment' });

beforeEach(() => jest.clearAllMocks());

describe('AssignmentCreate — AI wiring', () => {
  it('renders the AssignmentAI generate button', () => {
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);
    expect(screen.getByTestId('assignment-notes-ai')).toBeInTheDocument();
    expect(screen.getByText('Generate Assignment')).toBeInTheDocument();
  });

  it('enables AI and starts streaming once a student + song are set', () => {
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);
    const btn = screen.getByText('Generate Assignment').closest('button')!;
    expect(btn).toBeDisabled();

    fireEvent.click(studentPill('Emma'));
    fireEvent.change(screen.getByLabelText(/^Song \/ drill/), { target: { value: 'g1' } });

    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(mockStart).toHaveBeenCalled();
  });
});

describe('AssignmentCreate — form fields, validation, submit', () => {
  it('renders the create-mode header and sections', () => {
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);
    expect(
      screen.getByRole('heading', { level: 1, name: /^New\s+assignment\s*\.$/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Student' })).toBeInTheDocument();
    const song = screen.getByLabelText(/^Song \/ drill/);
    expect(within(song).getByRole('option', { name: 'Wonderwall — Oasis' })).toBeInTheDocument();
    expect(screen.getByLabelText('Task description')).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
    expect(screen.getByLabelText('Daily target')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Self-report' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Audio recording' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Video' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Note' })).toBeInTheDocument();
    expect(sendButton()).toBeInTheDocument();
  });

  it('keeps the extras section (custom title, checklist, drill) collapsed on create', () => {
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);
    const extras = screen.getByRole('button', { name: /Title, checklist & drills/ });
    expect(extras).toHaveAttribute('aria-expanded', 'false');
    // Hidden rather than unmounted, so the title still belongs to the form.
    expect(document.querySelector('#assignment-title')).not.toBeVisible();

    fireEvent.click(extras);
    expect(extras).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Title')).toBeVisible();
  });

  it('requires a student and a song or task before submitting', async () => {
    const { container } = renderWithIntl(
      <AssignmentCreate mode="create" students={students} songs={songs} />
    );
    fireEvent.submit(container.querySelector('form')!);

    expect(await screen.findByText('Choose a student.')).toBeInTheDocument();
    expect(screen.getByText('Pick a song or describe the task.')).toBeInTheDocument();
    expect(createAssignmentAction).not.toHaveBeenCalled();
    // Focus jumps to the first invalid field.
    expect(document.activeElement).toBe(document.querySelector('#assignment-student'));
  });

  it('falls back to the song title when no custom title is typed', async () => {
    (createAssignmentAction as jest.Mock).mockResolvedValue({ assignmentId: 'new-assignment-id' });
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fireEvent.change(screen.getByLabelText(/^Song \/ drill/), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-04-30' } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(createAssignmentAction).toHaveBeenCalled());
    expect(createAssignmentAction).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 's1',
        title: 'Wonderwall',
        songId: 'g1',
        dueDate: '2026-04-30',
        // Defaults when the teacher leaves these fields untouched.
        dailyTargetMinutes: null,
        submissionType: 'self_report',
      })
    );
    expect(mockPush).toHaveBeenCalledWith('/dashboard/assignments/new-assignment-id');
  });

  it('uses the first line of the task as the title when there is no song', async () => {
    (createAssignmentAction as jest.Mock).mockResolvedValue({ assignmentId: 'x' });
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fireEvent.change(screen.getByLabelText('Task description'), {
      target: { value: 'Spider exercise at 80 bpm\nThen 90 bpm' },
    });
    fireEvent.click(sendButton());

    await waitFor(() => expect(createAssignmentAction).toHaveBeenCalled());
    expect(createAssignmentAction).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Spider exercise at 80 bpm', songId: null })
    );
  });

  it('creates one assignment per selected student and returns to the list', async () => {
    (createAssignmentAction as jest.Mock)
      .mockResolvedValueOnce({ assignmentId: 'a-emma' })
      .mockResolvedValueOnce({ assignmentId: 'a-liam' });
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fireEvent.click(studentPill('Liam'));
    fireEvent.change(screen.getByLabelText(/^Song \/ drill/), { target: { value: 'g1' } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(createAssignmentAction).toHaveBeenCalledTimes(2));
    expect((createAssignmentAction as jest.Mock).mock.calls.map((c) => c[0].studentId)).toEqual([
      's1',
      's2',
    ]);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/assignments');
  });

  it('stops the batch at the first failure and reports it', async () => {
    (createAssignmentAction as jest.Mock).mockResolvedValueOnce({ error: 'Emma is archived.' });
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fireEvent.click(studentPill('Liam'));
    fireEvent.change(screen.getByLabelText(/^Song \/ drill/), { target: { value: 'g1' } });
    fireEvent.click(sendButton());

    expect(await screen.findByText('Emma is archived.')).toBeInTheDocument();
    expect(createAssignmentAction).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('persists the chosen daily target and submission type in the create payload', async () => {
    (createAssignmentAction as jest.Mock).mockResolvedValue({ assignmentId: 'x' });
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fireEvent.change(screen.getByLabelText(/^Song \/ drill/), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText('Daily target'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Video' }));
    fireEvent.click(sendButton());

    await waitFor(() => expect(createAssignmentAction).toHaveBeenCalled());
    expect(createAssignmentAction).toHaveBeenCalledWith(
      expect.objectContaining({ dailyTargetMinutes: 15, submissionType: 'video' })
    );
  });

  it('surfaces a server error without navigating', async () => {
    (createAssignmentAction as jest.Mock).mockResolvedValue({ error: 'Something went wrong.' });
    renderWithIntl(<AssignmentCreate mode="create" students={students} songs={songs} />);

    fireEvent.click(studentPill('Emma'));
    fireEvent.change(screen.getByLabelText(/^Song \/ drill/), { target: { value: 'g1' } });
    fireEvent.click(sendButton());

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('edit mode pre-fills fields and submits via updateAssignmentAction', async () => {
    (updateAssignmentAction as jest.Mock).mockResolvedValue({ assignmentId: 'a1' });
    renderWithIntl(
      <AssignmentCreate
        mode="edit"
        students={students}
        songs={songs}
        initial={{
          assignmentId: 'a1',
          studentId: 's1',
          title: 'Existing assignment',
          description: null,
          dueDate: '2026-04-30T00:00:00.000Z',
          songId: 'g1',
          dailyTargetMinutes: 20,
          submissionType: 'audio',
        }}
      />
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /^Edit\s+assignment\s*\.$/ })
    ).toBeInTheDocument();
    // The student is fixed on edit — no picker.
    expect(screen.queryByRole('group', { name: 'Student' })).not.toBeInTheDocument();
    // A populated extras section opens on edit.
    expect(screen.getByDisplayValue('Existing assignment')).toBeVisible();
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-04-30');
    // Seeded from `initial`: the target select and the submission toggle.
    expect(screen.getByLabelText('Daily target')).toHaveValue('20');
    expect(screen.getByRole('radio', { name: 'Audio recording' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(updateAssignmentAction).toHaveBeenCalledWith(
        'a1',
        expect.objectContaining({
          studentId: 's1',
          title: 'Existing assignment',
          dailyTargetMinutes: 20,
          submissionType: 'audio',
        })
      )
    );
    expect(mockPush).toHaveBeenCalledWith('/dashboard/assignments/a1');
  });
});
