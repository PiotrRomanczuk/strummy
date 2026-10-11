import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { InviteTeacherButton } from './InviteTeacherButton';

const mockInviteUser = jest.fn();
jest.mock('@/app/dashboard/actions', () => ({
  inviteUser: (...args: unknown[]) => mockInviteUser(...args),
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

describe('InviteTeacherButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('invites the address as a teacher and shows the sent state', async () => {
    mockInviteUser.mockResolvedValue({ success: true, userId: 'u1' });
    render(<InviteTeacherButton />);
    fireEvent.click(screen.getByTestId('invite-teacher-open'));
    expect(screen.getByTestId('invite-teacher-send')).toBeDisabled();
    fireEvent.change(screen.getByTestId('invite-teacher-name'), { target: { value: 'Ann Lee' } });
    fireEvent.change(screen.getByTestId('invite-teacher-email'), {
      target: { value: 'ann@example.com' },
    });
    fireEvent.click(screen.getByTestId('invite-teacher-send'));
    await waitFor(() => expect(screen.getByTestId('invite-teacher-sent')).toBeInTheDocument());
    expect(mockInviteUser).toHaveBeenCalledWith('ann@example.com', 'Ann Lee', 'teacher');
  });

  it('shows the server error and stays open', async () => {
    mockInviteUser.mockRejectedValue(new Error('Only admins can invite users'));
    render(<InviteTeacherButton />);
    fireEvent.click(screen.getByTestId('invite-teacher-open'));
    fireEvent.change(screen.getByTestId('invite-teacher-name'), { target: { value: 'Ann' } });
    fireEvent.change(screen.getByTestId('invite-teacher-email'), {
      target: { value: 'ann@example.com' },
    });
    fireEvent.click(screen.getByTestId('invite-teacher-send'));
    await waitFor(() =>
      expect(screen.getByTestId('invite-teacher-error')).toHaveTextContent('Only admins')
    );
    expect(screen.queryByTestId('invite-teacher-sent')).toBeNull();
  });
});
