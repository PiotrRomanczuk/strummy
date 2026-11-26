import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';

import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';

import { ApiKeyManager } from './ApiKeyManager';

const KEY = {
  id: 'k1',
  name: 'Mobile app',
  created_at: '2026-11-03T12:00:00Z',
  last_used_at: null,
  is_active: true,
};

const renderIn = (locale: 'en' | 'pl') =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'en' ? enMessages : plMessages}
      timeZone="Europe/Warsaw"
    >
      <ApiKeyManager />
    </NextIntlClientProvider>
  );

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [KEY] });
});

describe('ApiKeyManager', () => {
  it('leaves the page title and description to the settings shell', async () => {
    renderIn('en');
    await screen.findByText('Mobile app');
    expect(screen.queryByRole('heading', { name: 'API Keys' })).not.toBeInTheDocument();
    expect(screen.queryByText(/programmatic access/)).not.toBeInTheDocument();
  });

  it('is in Polish for a Polish viewer, dates included', async () => {
    renderIn('pl');
    await waitFor(() => expect(screen.getByText('Mobile app')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Utwórz nowy klucz API' })).toBeInTheDocument();
    expect(screen.getByText(/lis 2026/)).toBeInTheDocument();
    expect(screen.getByText('Nigdy')).toBeInTheDocument();
  });

  it('no longer carries the old product name in either language', () => {
    expect(JSON.stringify(enMessages.Settings)).not.toMatch(/Guitar CRM/);
    expect(JSON.stringify(plMessages.Settings)).not.toMatch(/Guitar CRM/);
  });
});
