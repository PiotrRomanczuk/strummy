import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import { TeacherLeadForm } from './TeacherLeadForm';
import { submitTeacherLead } from '@/app/actions/teacher-leads';
import messages from '@/messages/en.json';

jest.mock('@/app/actions/teacher-leads', () => ({
  submitTeacherLead: jest.fn(),
}));

const searchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

const mockSubmit = submitTeacherLead as jest.MockedFunction<typeof submitTeacherLead>;

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <TeacherLeadForm />
    </NextIntlClientProvider>
  );

const fillRequired = () => {
  fireEvent.change(screen.getByTestId('lead-name'), { target: { value: 'Anna Kowalska' } });
  fireEvent.change(screen.getByTestId('lead-email'), { target: { value: 'anna@example.com' } });
};

describe('TeacherLeadForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParams.forEach((_, key) => searchParams.delete(key));
  });

  it('submits name and email and shows the thank-you state', async () => {
    mockSubmit.mockResolvedValue({ success: true });
    renderForm();
    fillRequired();
    fireEvent.click(screen.getByTestId('lead-submit'));

    await waitFor(() => expect(screen.getByTestId('lead-success')).toBeInTheDocument());
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Anna Kowalska', email: 'anna@example.com' })
    );
  });

  it('defaults the contact consent to opted in', async () => {
    mockSubmit.mockResolvedValue({ success: true });
    renderForm();
    fillRequired();
    fireEvent.click(screen.getByTestId('lead-submit'));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ wantsContact: true }));
  });

  it('carries the campaign source from the URL rather than a field', async () => {
    // The promo link is what knows where the visitor came from; asking them
    // would be both noise and unreliable.
    searchParams.set('utm_source', 'facebook-teachers');
    mockSubmit.mockResolvedValue({ success: true });
    renderForm();
    fillRequired();
    fireEvent.click(screen.getByTestId('lead-submit'));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'facebook-teachers' })
    );
  });

  it('renders the server error as translated copy, not a raw key', async () => {
    mockSubmit.mockResolvedValue({ success: false, error: 'errors.rateLimited' });
    renderForm();
    fillRequired();
    fireEvent.click(screen.getByTestId('lead-submit'));

    await waitFor(() =>
      expect(screen.getByText(messages.ForTeachers.errors.rateLimited)).toBeInTheDocument()
    );
    expect(screen.queryByTestId('lead-success')).not.toBeInTheDocument();
  });

  it('clears the error once the visitor starts correcting the form', async () => {
    mockSubmit.mockResolvedValue({ success: false, error: 'errors.generic' });
    renderForm();
    fillRequired();
    fireEvent.click(screen.getByTestId('lead-submit'));
    await waitFor(() =>
      expect(screen.getByText(messages.ForTeachers.errors.generic)).toBeInTheDocument()
    );

    fireEvent.change(screen.getByTestId('lead-email'), { target: { value: 'anna@fixed.com' } });
    expect(screen.queryByText(messages.ForTeachers.errors.generic)).not.toBeInTheDocument();
  });
});
