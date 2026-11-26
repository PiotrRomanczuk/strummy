import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { renderWithIntl as render } from '@/lib/testing/intl-test-utils';
import plMessages from '@/messages/pl.json';
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
const mockUpdateLocale = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      setSession: mockSetSession,
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  })),
}));

jest.mock('@/app/actions/profile-settings', () => ({
  updateLocaleAction: (...args: unknown[]) => mockUpdateLocale(...args),
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
    mockUpdateLocale.mockResolvedValue({});
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

  it('sends a student with a dead link to their teacher and to sign-in, not to sign-up', async () => {
    render(<AcceptInvitationForm />);

    expect(
      await screen.findByText(/ask your teacher to send you a new invitation/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByRole('link', { name: /create a new account/i })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/sign-up"]')).toBeNull();
  });

  it('shows the same dead-link state in Polish', async () => {
    rtlRender(
      <NextIntlClientProvider locale="pl" messages={plMessages}>
        <AcceptInvitationForm />
      </NextIntlClientProvider>
    );

    expect(
      await screen.findByText(/Poproś nauczyciela o wysłanie nowego zaproszenia/)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zaloguj się' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByText('Załóż nowe konto')).not.toBeInTheDocument();
  });

  it('ignores a recovery fragment — wrong flow for this page', async () => {
    setHash('#access_token=tok&refresh_token=ref&type=recovery');

    render(<AcceptInvitationForm />);

    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  describe('language of the new account', () => {
    const submit = async () => {
      setHash('#access_token=tok&refresh_token=ref&type=invite');
      const user = userEvent.setup();
      render(<AcceptInvitationForm />);
      await user.type(await screen.findByLabelText(/create password/i), 'Str0ng!Passw0rd');
      await user.type(screen.getByLabelText(/confirm password/i), 'Str0ng!Passw0rd');
      await user.click(screen.getByRole('button', { name: /set password/i }));
    };

    // profiles.locale defaults to 'en' and outranks the browser language, so
    // without this write an invited student got the app in English whatever
    // language the invitation page was shown in (#1176).
    it('saves the language the invitation was read in, then goes to onboarding', async () => {
      await submit();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/onboarding'));
      expect(mockUpdateLocale).toHaveBeenCalledWith('en');
      expect(mockUpdateLocale.mock.invocationCallOrder[0]).toBeLessThan(
        mockPush.mock.invocationCallOrder[0]
      );
    });

    it('still completes the claim when saving the language fails', async () => {
      mockUpdateLocale.mockRejectedValue(new Error('network'));

      await submit();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/onboarding'));
    });

    it('does not touch the language when the password is rejected', async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: 'weak' } });

      await submit();

      expect(await screen.findByText('weak')).toBeInTheDocument();
      expect(mockUpdateLocale).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
