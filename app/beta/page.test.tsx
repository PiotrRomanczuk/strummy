import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createTranslator } from 'next-intl';

import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';
import BetaNoticePage, { generateMetadata } from './page';

// `getTranslations` normally resolves the request locale from cookies; here the
// locale is picked per test so both languages can be rendered.
let mockLocale: 'en' | 'pl' = 'en';
jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale: mockLocale,
      messages: mockLocale === 'pl' ? plMessages : enMessages,
      namespace: namespace as 'BetaNotice',
    }),
}));

jest.mock('next/font/google', () => {
  const font = () => ({ variable: 'font-var' });
  return { Fraunces: font, Geist: font, Geist_Mono: font };
});

describe('/beta', () => {
  it('renders the English notice', async () => {
    mockLocale = 'en';
    render(await BetaNoticePage());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Beta notice');
    expect(screen.getByText('What is stored')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'p.romanczuk@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:p.romanczuk@gmail.com'
    );
  });

  it('renders the Polish notice, with the contact address filled in', async () => {
    mockLocale = 'pl';
    render(await BetaNoticePage());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Informacja o becie');
    expect(screen.getByText('Co jest przechowywane')).toBeInTheDocument();
    expect(screen.getByText(/Napisz na p\.romanczuk@gmail\.com/)).toBeInTheDocument();
    expect(screen.queryByText('What is stored')).not.toBeInTheDocument();
  });

  it('translates the page title', async () => {
    mockLocale = 'pl';
    expect((await generateMetadata()).title).toBe('Informacja o becie — Strummy');
  });

  it('has the same sections and paragraphs in both languages', () => {
    const shape = (messages: typeof enMessages) =>
      Object.entries(messages.BetaNotice).map(([key, value]) =>
        typeof value === 'string' ? key : [key, Object.keys(value)]
      );
    expect(shape(plMessages)).toEqual(shape(enMessages));
  });
});
