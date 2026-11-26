import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextIntlClientProvider, createTranslator } from 'next-intl';

import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';
import AuthCodeError from './page';

let mockLocale: 'en' | 'pl' = 'en';
jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale: mockLocale,
      messages: mockLocale === 'pl' ? plMessages : enMessages,
      namespace: namespace as 'AuthCodeError',
    }),
}));

jest.mock('@/lib/config/dashboard-fonts', () => ({ dashboardFontVariables: 'font-var' }));

const renderPage = async (locale: 'en' | 'pl') => {
  mockLocale = locale;
  const ui = await AuthCodeError();
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'pl' ? plMessages : enMessages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('/auth/auth-code-error', () => {
  it('has a heading and a way back to sign-in (English)', async () => {
    await renderPage('en');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "That sign-in link didn't work"
    );
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/sign-in'
    );
  });

  it('is fully Polish for a Polish visitor', async () => {
    await renderPage('pl');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Ten link do logowania nie zadziałał'
    );
    expect(screen.getByRole('link', { name: 'Wróć do logowania' })).toHaveAttribute(
      'href',
      '/sign-in'
    );
    expect(screen.queryByText(/authentication/i)).not.toBeInTheDocument();
  });
});
