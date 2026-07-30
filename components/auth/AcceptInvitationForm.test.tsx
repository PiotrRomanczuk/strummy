import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AcceptInvitationForm from '@/components/auth/AcceptInvitationForm';

/**
 * This form had no test coverage while carrying the only working
 * fragment-to-session handover in the app. It was refactored onto the shared
 * useAuthHashSession hook (2026-07-30) so reset-password could reuse it, so its
 * behaviour is pinned here: the invite flow is how real students get an account.
 */
const mockSetSession = jest.fn();
const mockGetUser = jest.fn();
const mockUpdateUser = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      setSession: mockSetSession,
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const setHash = (hash: string) => {
  window.location.hash = hash;
};

describe('AcceptInvitationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHash('');
    mockSetSession.mockResolvedValue({ data: {}, error: null });
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
  });

  afterEach(() => setHash(''));

  it('shows a verifying state before the session is resolved', async () => {
    setHash('#access_token=tok&refresh_token=ref&type=invite');

    render(<AcceptInvitationForm />);

    expect(screen.getByText(/verifying your invite/i)).toBeInTheDocument();

    // Let the pending setSession settle inside act(), so the transition out of
    // the loading phase is not an update outside the test's control.
    expect(await screen.findByLabelText(/create password/i)).toBeInTheDocument();
  });

  it('establishes a session from an invite fragment and reveals the form', async () => {
    setHash('#access_token=tok-abc&refresh_token=ref-xyz&type=invite');

    render(<AcceptInvitationForm />);

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'tok-abc',
        refresh_token: 'ref-xyz',
      });
    });
    expect(await screen.findByLabelText(/create password/i)).toBeInTheDocument();
  });

  it('accepts an existing cookie session with no fragment', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    render(<AcceptInvitationForm />);

    expect(await screen.findByLabelText(/create password/i)).toBeInTheDocument();
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('reports an expired invite instead of showing the form', async () => {
    setHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+expired');

    render(<AcceptInvitationForm />);

    expect(await screen.findByText(/this invitation link has expired/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/create password/i)).not.toBeInTheDocument();
  });

  it('reports an invalid invite when there is no token and no session', async () => {
    render(<AcceptInvitationForm />);

    expect(
      await screen.findByText(/invitation link appears to be invalid or expired/i)
    ).toBeInTheDocument();
  });

  it('ignores a recovery fragment — wrong flow for this page', async () => {
    setHash('#access_token=tok&refresh_token=ref&type=recovery');

    render(<AcceptInvitationForm />);

    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});
