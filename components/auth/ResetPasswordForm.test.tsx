import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

// Mock Supabase browser client
const mockUpdateUser = jest.fn();

jest.mock('@/lib/supabase-browser', () => ({
  getSupabaseBrowserClient: jest.fn(() => ({
    auth: {
      updateUser: mockUpdateUser,
    },
  })),
}));

// useAuthHashSession uses the canonical client module. Without this mock the
// hook would attempt a real network getUser() and never leave 'loading'.
const mockSetSession = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      setSession: mockSetSession,
      getUser: mockGetUser,
    },
  })),
}));

const setHash = (hash: string) => {
  window.location.hash = hash;
};

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHash('');
    // Default: an existing (PKCE cookie) session, the normal in-app path.
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSetSession.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    setHash('');
  });

  describe('Rendering', () => {
    it('should render reset password form with password fields', async () => {
      render(<ResetPasswordForm />);

      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();

      // Settle the session check so its state update lands inside act().
      await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    });

    it('should render password requirements', async () => {
      render(<ResetPasswordForm />);

      expect(screen.getByText(/minimum 6 characters/i)).toBeInTheDocument();

      await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    });
  });

  describe('Form Validation', () => {
    it('should show error for password shorter than 6 characters', async () => {
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText(/^new password$/i);
      fireEvent.change(passwordInput, { target: { value: '12345' } });
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error when passwords do not match', async () => {
      render(<ResetPasswordForm />);

      fireEvent.change(screen.getByLabelText(/^new password$/i), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'different123' },
      });

      const submitButton = screen.getByRole('button', {
        name: /reset password/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('should show error when new password is empty', async () => {
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText(/^new password$/i);
      fireEvent.change(passwordInput, { target: { value: '' } });
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error when confirm password is empty', async () => {
      render(<ResetPasswordForm />);

      const confirmInput = screen.getByLabelText(/confirm password/i);
      fireEvent.change(confirmInput, { target: { value: '' } });
      fireEvent.blur(confirmInput);

      await waitFor(() => {
        expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
      });
    });

    it('should not submit form with validation errors', async () => {
      render(<ResetPasswordForm />);

      const submitButton = screen.getByRole('button', {
        name: /reset password/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call updateUser with new password on valid submission', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      });

      render(<ResetPasswordForm />);

      fireEvent.change(screen.getByLabelText(/^new password$/i), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'newpassword123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          password: 'newpassword123',
        });
      });
    });

    it('should show success message on successful reset', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      });

      render(<ResetPasswordForm />);

      fireEvent.change(screen.getByLabelText(/^new password$/i), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'newpassword123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error message on reset failure', async () => {
      mockUpdateUser.mockResolvedValue({
        data: null,
        error: { message: 'Invalid reset token' },
      });

      render(<ResetPasswordForm />);

      fireEvent.change(screen.getByLabelText(/^new password$/i), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'newpassword123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid reset token/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      mockUpdateUser.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { user: { id: '123' } }, error: null }), 100)
          )
      );

      render(<ResetPasswordForm />);

      fireEvent.change(screen.getByLabelText(/^new password$/i), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'newpassword123' },
      });

      const submitButton = screen.getByRole('button', {
        name: /reset password/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show loading state while submitting', async () => {
      mockUpdateUser.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { user: { id: '123' } }, error: null }), 100)
          )
      );

      render(<ResetPasswordForm />);

      fireEvent.change(screen.getByLabelText(/^new password$/i), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'newpassword123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/resetting/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle new password visibility', async () => {
      render(<ResetPasswordForm />);

      const passwordInput = screen.getByLabelText(/^new password$/i);
      const toggleButton = screen.getAllByRole('button', {
        name: /show password/i,
      })[0];

      expect(passwordInput).toHaveAttribute('type', 'password');

      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(passwordInput).toHaveAttribute('type', 'text');
      });
    });

    it('should toggle confirm password visibility', async () => {
      render(<ResetPasswordForm />);

      const confirmInput = screen.getByLabelText(/confirm password/i);
      const toggleButton = screen.getAllByRole('button', {
        name: /show password/i,
      })[1];

      expect(confirmInput).toHaveAttribute('type', 'password');

      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(confirmInput).toHaveAttribute('type', 'text');
      });
    });
  });

  /**
   * REGRESSION: recovery links hand the session over in the URL fragment, which
   * never reaches the server, so /auth/callback cannot consume it. Before this
   * was handled, the form rendered with no session and updateUser() failed with
   * the useless "Auth session missing!".
   */
  describe('Recovery link session handover', () => {
    it('establishes a session from a recovery fragment', async () => {
      setHash('#access_token=tok-abc&refresh_token=ref-xyz&type=recovery&expires_in=3600');

      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(mockSetSession).toHaveBeenCalledWith({
          access_token: 'tok-abc',
          refresh_token: 'ref-xyz',
        });
      });
      // getUser is the no-hash fallback; it must not run when a token was used.
      expect(mockGetUser).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });

    it('strips the tokens from the URL once the session is set', async () => {
      const replaceState = jest.spyOn(window.history, 'replaceState');
      setHash('#access_token=tok-abc&refresh_token=ref-xyz&type=recovery');

      render(<ResetPasswordForm />);

      await waitFor(() => expect(replaceState).toHaveBeenCalled());
      expect(replaceState.mock.calls[0][2]).not.toContain('access_token');
      replaceState.mockRestore();
    });

    it('ignores a fragment whose type is not recovery', async () => {
      // An invite hash must not silently authenticate on this page.
      setHash('#access_token=tok-abc&refresh_token=ref-xyz&type=invite');

      render(<ResetPasswordForm />);

      await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('shows an actionable error for an expired link', async () => {
      setHash(
        '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'
      );

      render(<ResetPasswordForm />);

      expect(await screen.findByText(/this password reset link has expired/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /request a new reset link/i })).toBeInTheDocument();
      // The dead form must be gone, not merely annotated.
      expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument();
    });

    it('shows an actionable error when there is no session at all', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      render(<ResetPasswordForm />);

      expect(await screen.findByText(/invalid or has already been used/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument();
    });

    it('surfaces an error when the token exchange itself fails', async () => {
      mockSetSession.mockResolvedValue({ data: {}, error: { message: 'bad token' } });
      setHash('#access_token=tok-abc&refresh_token=ref-xyz&type=recovery');

      render(<ResetPasswordForm />);

      expect(await screen.findByText(/this password reset link has expired/i)).toBeInTheDocument();
    });
  });
});
