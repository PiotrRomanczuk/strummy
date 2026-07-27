import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Header from '@/components/navigation/Header';
import { useRouter } from 'next/navigation';

jest.setTimeout(30000);

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/profile'),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => {
    // console.log('Mock createClient called');
    return {
      auth: {
        signOut: jest.fn().mockImplementation(() => {
          // console.log('Mock signOut called');
          return Promise.resolve({});
        }),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
      },
    };
  }),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('Header', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      refresh: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    } as never);
  });

  it('should render sign in and sign up buttons when user is not authenticated', () => {
    render(<Header user={null} isAdmin={false} isTeacher={false} isStudent={false} />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('should render user email when authenticated', () => {
    render(
      <Header
        user={{ id: 'test-user', email: 'test@example.com' }}
        isAdmin={false}
        isTeacher={false}
        isStudent={false}
      />
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('points sign out at the server route rather than a client-side redirect', async () => {
    // Sign-out must be a real navigation to `/auth/signout`, NOT a client-side
    // `supabase.auth.signOut()` + `router.push('/sign-in')`. The session is an
    // `sb-*` cookie that only the server can clear; the old client path left it
    // intact, so middleware kept the session alive and the user stayed signed in.
    // An anchor also means sign-out still works if JS fails.
    render(
      <Header
        user={{ id: 'test-user', email: 'test@example.com' }}
        isAdmin={false}
        isTeacher={false}
        isStudent={false}
      />
    );

    const signOut = screen.getAllByText('Sign Out')[0];
    expect(signOut.closest('a')).toHaveAttribute('href', '/auth/signout');

    fireEvent.click(signOut);
    // Must not shortcut to /sign-in — that was the false-green: it looked signed
    // out while the session cookie survived.
    await waitFor(() => expect(mockPush).not.toHaveBeenCalledWith('/sign-in'));
  }, 30000);

  it('should navigate to home when logo is clicked', () => {
    render(<Header user={null} isAdmin={false} isTeacher={false} isStudent={false} />);

    // The logo contains a button with the text (either "Guitar CRM" on desktop or "CRM" on mobile)
    // We look for the button that contains the guitar emoji
    const buttons = screen.getAllByRole('button');
    const logoButton = buttons.find((btn) => btn.textContent?.includes('🎸'));

    expect(logoButton).toBeInTheDocument();

    if (logoButton) {
      fireEvent.click(logoButton);
      expect(mockPush).toHaveBeenCalledWith('/');
    }
  });

  it('should show role badges for authenticated users', () => {
    render(
      <Header
        user={{ id: 'test-user', email: 'test@example.com' }}
        isAdmin={true}
        isTeacher={true}
        isStudent={false}
      />
    );

    // Check for role badges (not navigation items)
    const badges = screen.getAllByText(/Admin|Teacher/);
    expect(badges.length).toBeGreaterThan(0);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should show sign in/up buttons when no user', () => {
    render(<Header user={null} isAdmin={false} isTeacher={false} isStudent={false} />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });
});
