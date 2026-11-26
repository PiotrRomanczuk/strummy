import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';

import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';

import { ForbiddenNotice } from './ForbiddenNotice';

const mockReplace = jest.fn();
let mockQuery = 'error=forbidden';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(mockQuery),
}));

const renderIn = (locale: 'en' | 'pl') =>
  render(
    <NextIntlClientProvider locale={locale} messages={locale === 'en' ? enMessages : plMessages}>
      <ForbiddenNotice />
    </NextIntlClientProvider>
  );

beforeEach(() => {
  mockReplace.mockReset();
  mockQuery = 'error=forbidden';
});

describe('ForbiddenNotice', () => {
  it('tells the visitor they were sent back, in both languages', () => {
    const { unmount } = renderIn('en');
    expect(screen.getByRole('alert')).toHaveTextContent("You don't have access to that page");
    unmount();
    renderIn('pl');
    expect(screen.getByRole('alert')).toHaveTextContent('Nie masz dostępu do tej strony');
  });

  it('dismisses and drops only the error parameter from the URL', () => {
    mockQuery = 'view=teacher&error=forbidden';
    renderIn('en');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard?view=teacher');
  });

  it('goes back to the bare path when error was the only parameter', () => {
    renderIn('en');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});
