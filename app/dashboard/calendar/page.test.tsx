/** Calendar page: integration cards (Google Calendar, Spotify) are staff-only. */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import CalendarPage from './page';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

jest.mock('@/app/design-tokens.css', () => ({}), { virtual: true });
jest.mock('next/font/google', () => {
  const font = () => ({ variable: 'font-var' });
  return { Fraunces: font, Geist: font, Geist_Mono: font };
});
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));
jest.mock('@/lib/services/lessons-queries', () => ({
  getLessonsInRange: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      }),
    }),
  }),
}));
jest.mock('@/components/lessons/MonthCalendar', () => ({ MonthCalendar: () => <div /> }));
jest.mock('@/components/lessons/attendance/AttendanceReview', () => ({
  AttendanceReview: () => <div />,
}));
jest.mock('@/components/lessons/integrations/HistoricalCalendarSync', () => ({
  HistoricalCalendarSync: () => <div />,
}));
jest.mock('@/components/lessons/integrations/CalendarWebhookControl', () => ({
  CalendarWebhookControl: () => <div />,
}));
jest.mock('@/components/settings/IntegrationsSection', () => ({
  IntegrationsSection: () => <div data-testid="integrations" />,
}));

const mockRoles = getUserWithRolesSSR as jest.MockedFunction<typeof getUserWithRolesSSR>;

const renderAs = async (roles: { isTeacher: boolean; isAdmin: boolean; isStudent: boolean }) => {
  mockRoles.mockResolvedValue({
    user: { id: 'auth-1' },
    profileId: 'p-1',
    ...roles,
  } as unknown as Awaited<ReturnType<typeof getUserWithRolesSSR>>);
  render(await CalendarPage({ searchParams: Promise.resolve({}) }));
};

describe('CalendarPage integrations', () => {
  it('hides the integration cards from a student', async () => {
    await renderAs({ isTeacher: false, isAdmin: false, isStudent: true });
    expect(screen.queryByTestId('integrations')).not.toBeInTheDocument();
    expect(screen.queryByText('connectPrompt')).not.toBeInTheDocument();
  });

  it('shows them to a teacher', async () => {
    await renderAs({ isTeacher: true, isAdmin: false, isStudent: false });
    expect(screen.getByTestId('integrations')).toBeInTheDocument();
  });
});
