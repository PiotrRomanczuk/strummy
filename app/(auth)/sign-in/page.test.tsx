import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignInPage from './page';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signIn as signInAction } from '@/app/auth/actions';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/app/auth/actions', () => ({
  signIn: jest.fn(),
}));

jest.mock('@/components/auth/MFAChallengeDialog', () => ({
  MFAChallengeDialog: ({ open, factorId }: { open: boolean; factorId: string }) =>
    open ? <div data-testid="mfa-dialog" data-factor-id={factorId} /> : null,
}));

const mockRouter = { push: jest.fn(), refresh: jest.fn() };

function setupSupabaseClient(
  overrides: {
    user?: { id: string } | null;
    oauthError?: { message: string } | null;
  } = {}
) {
  const getUser = jest.fn().mockResolvedValue({
    data: { user: overrides.user ?? null },
  });
  const signInWithOAuth = jest.fn().mockResolvedValue({
    error: overrides.oauthError ?? null,
  });
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser, signInWithOAuth },
  });
  return { getUser, signInWithOAuth };
}

function setupSearchParams(params: Record<string, string> = {}) {
  (useSearchParams as jest.Mock).mockReturnValue({
    get: (key: string) => params[key] ?? null,
  });
}

describe('SignInPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    setupSearchParams();
    setupSupabaseClient();
  });

  it('redirects to /dashboard when a session already exists', async () => {
    setupSupabaseClient({ user: { id: 'user-1' } });

    render(<SignInPage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('renders the sign-in form once the session check resolves', async () => {
    render(<SignInPage />);

    expect(await screen.findByTestId('email')).toBeInTheDocument();
    expect(screen.getByTestId('password')).toBeInTheDocument();
    expect(screen.getByTestId('signin-button')).toBeInTheDocument();
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
    expect(screen.getByText(/try demo account/i)).toBeInTheDocument();
  });

  it('calls the signIn action and navigates to /dashboard on success', async () => {
    (signInAction as jest.Mock).mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(await screen.findByTestId('email'), 'user@example.com');
    await user.type(screen.getByTestId('password'), 'Password123!');
    await user.click(screen.getByTestId('signin-button'));

    await waitFor(() => {
      expect(signInAction).toHaveBeenCalledWith('user@example.com', 'Password123!');
    });
    expect(mockRouter.refresh).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('renders the server-side error returned by signIn', async () => {
    (signInAction as jest.Mock).mockResolvedValue({ error: 'Invalid credentials' });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(await screen.findByTestId('email'), 'user@example.com');
    await user.type(screen.getByTestId('password'), 'Password123!');
    await user.click(screen.getByTestId('signin-button'));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalledWith('/dashboard');
  });

  it('opens the MFA dialog when signIn requires MFA', async () => {
    (signInAction as jest.Mock).mockResolvedValue({
      success: true,
      mfaRequired: true,
      factorId: 'factor-123',
    });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(await screen.findByTestId('email'), 'user@example.com');
    await user.type(screen.getByTestId('password'), 'Password123!');
    await user.click(screen.getByTestId('signin-button'));

    const dialog = await screen.findByTestId('mfa-dialog');
    expect(dialog).toHaveAttribute('data-factor-id', 'factor-123');
    expect(mockRouter.push).not.toHaveBeenCalledWith('/dashboard');
  });

  it('starts Google OAuth with the correct redirectTo', async () => {
    const { signInWithOAuth } = setupSupabaseClient();
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.click(await screen.findByText(/continue with google/i));

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  });

  it('surfaces a Google OAuth error to the user', async () => {
    setupSupabaseClient({ oauthError: { message: 'OAuth provider unreachable' } });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.click(await screen.findByText(/continue with google/i));

    expect(await screen.findByText('OAuth provider unreachable')).toBeInTheDocument();
  });

  it('auto-fills demo credentials and submits when ?demo=true', async () => {
    setupSearchParams({ demo: 'true' });
    (signInAction as jest.Mock).mockResolvedValue({ success: true });

    render(<SignInPage />);

    // Demo flow defers via requestAnimationFrame + setTimeout(150).
    // Submitting eventually calls signIn with the demo credentials.
    await waitFor(
      () => {
        expect(signInAction).toHaveBeenCalledWith('sarah@strummy.app', 'Demo2024!');
      },
      { timeout: 1500 }
    );
  });

  // Suppress the unused `fireEvent` lint warning while keeping the import handy
  // for future tests that need synchronous events.
  void fireEvent;
});
