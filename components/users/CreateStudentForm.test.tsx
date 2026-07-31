import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { CreateStudentForm } from './CreateStudentForm';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const fillName = (value: string) =>
  fireEvent.change(screen.getByPlaceholderText('e.g. Emma Johnson'), { target: { value } });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CreateStudentForm', () => {
  it('renders the four intake sections and preview', () => {
    renderWithIntl(<CreateStudentForm />);
    expect(screen.getByRole('heading', { name: 'Add a student' })).toBeInTheDocument();
    expect(screen.getByText('I · IDENTITY')).toBeInTheDocument();
    expect(screen.getByText('II · CONTACT')).toBeInTheDocument();
    expect(screen.getByText('III · SCHEDULE')).toBeInTheDocument();
    expect(screen.getByText('IV · BILLING')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Emma Johnson')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'beginner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add student' })).toBeInTheDocument();
    expect(screen.getByText('New student')).toBeInTheDocument();
  });

  it('blocks submission and highlights the name when it is missing', () => {
    const { container } = renderWithIntl(<CreateStudentForm />);
    // Full name is HTML-required, so a real click is blocked by native
    // validation; dispatch submit directly to exercise the guard.
    fireEvent.submit(container.querySelector('form')!);

    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits the student with intake defaults and redirects', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'new-student-id' }) });
    renderWithIntl(<CreateStudentForm />);

    fillName('Emma Johnson');
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body).toMatchObject({
      full_name: 'Emma Johnson',
      isStudent: true,
      isShadow: true,
      skillLevel: 'beginner',
      instrument: 'Guitar',
      lessonDayOfWeek: 4,
      lessonDurationMinutes: 45,
      billingCycle: 'monthly',
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/users/new-student-id'));
  });

  it('maps student email to inviteEmail and parses the rate to a number', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'id-2' }) });
    renderWithIntl(<CreateStudentForm />);

    fillName('Sam Lee');
    fireEvent.change(screen.getByPlaceholderText('student@email.com'), {
      target: { value: 'sam@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('65'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.inviteEmail).toBe('sam@example.com');
    expect(body.lessonRate).toBe(80);
  });

  it('sends the selected level in the payload', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'id-3' }) });
    renderWithIntl(<CreateStudentForm />);

    fillName('Ada Byron');
    fireEvent.click(screen.getByRole('button', { name: 'advanced' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.skillLevel).toBe('advanced');
  });

  it('surfaces a server error without navigating', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email already invited.' }),
    });
    renderWithIntl(<CreateStudentForm />);

    fillName('Emma Johnson');
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));

    expect(await screen.findByText('Email already invited.')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
