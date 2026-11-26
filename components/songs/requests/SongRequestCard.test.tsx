import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';

import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';
import type { SongRequestWithStudent } from '@/schemas/SongRequestSchema';

import { SongRequestCard } from './SongRequestCard';

jest.mock('@/app/actions/song-requests', () => ({ reviewSongRequest: jest.fn() }));

const buildRequest = (overrides: Partial<SongRequestWithStudent> = {}): SongRequestWithStudent =>
  ({
    id: 'r1',
    student_id: 's1',
    title: 'Wonderwall',
    artist: 'Oasis',
    notes: null,
    url: null,
    status: 'pending',
    reviewed_by: null,
    review_notes: null,
    song_id: null,
    created_at: '2026-10-12T12:00:00.000Z',
    updated_at: '2026-10-12T12:00:00.000Z',
    student: { id: 's1', full_name: 'Ola Nowak' },
    ...overrides,
  }) as SongRequestWithStudent;

const renderIn = (locale: 'en' | 'pl', request: SongRequestWithStudent) =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'en' ? enMessages : plMessages}
      timeZone="Europe/Warsaw"
    >
      <SongRequestCard request={request} />
    </NextIntlClientProvider>
  );

describe('SongRequestCard', () => {
  it('names the student and writes the date the way the viewer reads it (en)', () => {
    renderIn('en', buildRequest());
    expect(screen.getByText('Ola Nowak')).toBeInTheDocument();
    expect(screen.getByText(/Oct 12, 2026/)).toBeInTheDocument();
    expect(screen.getByText('by Oasis')).toBeInTheDocument();
  });

  it('is fully Polish for a Polish viewer, with a day-month date, not 10/12/2026', () => {
    renderIn('pl', buildRequest());
    expect(screen.getByText(/Prosi:/)).toBeInTheDocument();
    expect(screen.getByText(/12 paź 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/10\/12\/2026/)).not.toBeInTheDocument();
  });

  it('falls back to a translated label when the student has no name', () => {
    renderIn('pl', buildRequest({ student: { id: 's1', full_name: null } }));
    expect(screen.getByText('Nieznany uczeń')).toBeInTheDocument();
  });
});
