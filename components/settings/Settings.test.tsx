/**
 * Component tests: Settings — the `/dashboard/settings` page shell
 * (one page, not tabbed). Closes the audit gap flagged in
 * `docs/app-blueprint/93-design-mockup-audit.md` ("Strummy - Settings.html"
 * row — only `NotificationPreferences.test.tsx` covered the sub-section,
 * the shell itself was untested).
 *
 * Note: unlike the audit's initial assumption, this shell does NOT render
 * `IntegrationsSection` or the `NotificationPreferences` component directly
 * — those are mounted as siblings by `app/dashboard/settings/page.tsx`. The
 * shell's own "Notifications" card is just a `Link` out to
 * `/dashboard/settings/notifications`, which is what's asserted below.
 *
 * @see components/settings/Settings.tsx
 * @see components/settings/Settings.AvatarUpload.tsx
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { Settings } from './Settings';
import { updateProfileNameAction } from '@/app/actions/profile-settings';
import { requestAccountDeletion, cancelAccountDeletion } from '@/app/actions/account';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/storage/avatar';

jest.mock('@/app/actions/profile-settings', () => ({
  updateProfileNameAction: jest.fn(),
}));

jest.mock('@/app/actions/account', () => ({
  requestAccountDeletion: jest.fn(),
  cancelAccountDeletion: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/storage/avatar', () => {
  const actual = jest.requireActual('@/lib/storage/avatar');
  return {
    ...actual,
    uploadAvatar: jest.fn(),
  };
});

const mockUpdateProfileNameAction = updateProfileNameAction as jest.Mock;
const mockRequestAccountDeletion = requestAccountDeletion as jest.Mock;
const mockCancelAccountDeletion = cancelAccountDeletion as jest.Mock;
const mockCreateClient = createClient as jest.Mock;
const mockUploadAvatar = uploadAvatar as jest.Mock;

const baseProps = {
  userId: 'user-42',
  email: 'sarah@strummy.app',
  fullName: 'Sarah Chen',
  phone: '+1 555 123 4567',
  avatarUrl: 'https://cdn.example.com/avatars/sarah.png',
  roleLabel: 'Teacher',
  deletionScheduledFor: null,
};

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProfileNameAction.mockResolvedValue({ saved: true });
    window.confirm = jest.fn(() => true);
    mockCreateClient.mockReturnValue({
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn(),
          getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })),
        })),
      },
    });
  });

  it('renders the settings header and profile fields with fixture data', () => {
    renderWithIntl(<Settings {...baseProps} />);

    expect(screen.getByText('Studio')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Your profile and how Strummy talks to you/i)).toBeInTheDocument();

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue(baseProps.email)).toBeDisabled();
    expect(screen.getByDisplayValue(baseProps.roleLabel)).toBeDisabled();
    expect(screen.getByDisplayValue(baseProps.fullName)).toBeEnabled();
    expect(screen.getByDisplayValue(baseProps.phone)).toBeEnabled();
  });

  it('mounts the avatar upload widget with the initial avatar URL', () => {
    const { container } = renderWithIntl(<Settings {...baseProps} />);

    // The value is mirrored into both the visible URL field and the hidden
    // `avatar_url` field the profile form submits — expect both.
    expect(screen.getAllByDisplayValue(baseProps.avatarUrl)).toHaveLength(2);
    expect(container.querySelector('input[type="url"]')).toHaveValue(baseProps.avatarUrl);
    expect(screen.getByText('Upload image')).toBeInTheDocument();
  });

  it('renders the Notifications card linking out to the dedicated preferences page', () => {
    renderWithIntl(<Settings {...baseProps} />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Notification preferences/i });
    expect(link).toHaveAttribute('href', '/dashboard/settings/notifications');
  });

  it('submits the profile form with edited fields plus the current avatar URL', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Settings {...baseProps} />);

    const nameInput = screen.getByDisplayValue(baseProps.fullName);
    await user.clear(nameInput);
    await user.type(nameInput, 'Sarah Connor');

    const phoneInput = screen.getByDisplayValue(baseProps.phone);
    await user.clear(phoneInput);
    await user.type(phoneInput, '+1 555 999 0000');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateProfileNameAction).toHaveBeenCalledTimes(1));

    const [, formData] = mockUpdateProfileNameAction.mock.calls[0];
    expect(formData.get('full_name')).toBe('Sarah Connor');
    expect(formData.get('phone')).toBe('+1 555 999 0000');
    expect(formData.get('avatar_url')).toBe(baseProps.avatarUrl);
  });

  it('shows a saved confirmation after a successful submit', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Settings {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText(/Saved/)).toBeInTheDocument());
  });

  it('surfaces a returned error without showing the saved confirmation', async () => {
    mockUpdateProfileNameAction.mockResolvedValue({ error: 'Could not save. Try again.' });
    const user = userEvent.setup();
    renderWithIntl(<Settings {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText('Could not save. Try again.')).toBeInTheDocument());
    expect(screen.queryByText(/Saved/)).not.toBeInTheDocument();
  });

  it('uploads a selected image file and reflects the new URL in the avatar field', async () => {
    mockUploadAvatar.mockResolvedValue({ url: 'https://cdn.example.com/avatars/new.png' });
    const { container } = renderWithIntl(<Settings {...baseProps} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(container.querySelector('input[type="url"]')).toHaveValue(
        'https://cdn.example.com/avatars/new.png'
      )
    );
    expect(container.querySelector('input[name="avatar_url"]')).toHaveValue(
      'https://cdn.example.com/avatars/new.png'
    );
    expect(mockUploadAvatar).toHaveBeenCalledWith(expect.anything(), baseProps.userId, file);
  });

  it('shows a validation error for an unsupported file type without calling uploadAvatar', async () => {
    const { container } = renderWithIntl(<Settings {...baseProps} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['not-an-image'], 'notes.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByTestId('avatar-upload-error')).toHaveTextContent(
        'Please choose a PNG, JPEG, WebP, or GIF image.'
      )
    );
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  describe('Danger zone', () => {
    it('renders a delete account button when no deletion is scheduled', () => {
      renderWithIntl(<Settings {...baseProps} />);

      expect(screen.getByText('Danger zone')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
    });

    it('requests account deletion after the user confirms the prompt', async () => {
      mockRequestAccountDeletion.mockResolvedValue({
        success: true,
        scheduledFor: '2026-09-01T00:00:00.000Z',
        message: 'Scheduled',
      });
      const user = userEvent.setup();
      renderWithIntl(<Settings {...baseProps} />);

      await user.click(screen.getByRole('button', { name: /delete account/i }));

      await waitFor(() => expect(mockRequestAccountDeletion).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('button', { name: /cancel deletion/i })).toBeInTheDocument();
    });

    it('renders the scheduled deletion date and lets the user cancel it', async () => {
      mockCancelAccountDeletion.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      renderWithIntl(<Settings {...baseProps} deletionScheduledFor="2026-09-01T00:00:00.000Z" />);

      expect(screen.getByRole('button', { name: /cancel deletion/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel deletion/i }));

      await waitFor(() => expect(mockCancelAccountDeletion).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
    });

    it('surfaces an error returned by the deletion request', async () => {
      mockRequestAccountDeletion.mockResolvedValue({
        error: 'Failed to schedule account deletion.',
      });
      const user = userEvent.setup();
      renderWithIntl(<Settings {...baseProps} />);

      await user.click(screen.getByRole('button', { name: /delete account/i }));

      await waitFor(() =>
        expect(screen.getByText('Failed to schedule account deletion.')).toBeInTheDocument()
      );
    });
  });
});
