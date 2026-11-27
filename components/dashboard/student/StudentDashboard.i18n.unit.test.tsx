/**
 * Student dashboard polish (issue #1180): proper plurals, a Polish week strip
 * and a practice read-out that does not divide by a zero target.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';
import { IntlMessageFormat } from 'intl-messageformat';

import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';
import { renderServerTree } from '@/lib/testing/intl-test-utils';
import { StudentPracticeSet } from './StudentDashboard.PracticeSet';
import { StudentStreakCard } from './StudentDashboard.Progress';
import { StudentWeekStrip } from './StudentDashboard.WeekStrip';
import { weekStrip } from './student-home.helpers';

const NOW = new Date(2026, 6, 20, 9, 30, 0);

const format = (messages: typeof enMessages, locale: string, key: string, values: object) =>
  new IntlMessageFormat((messages.StudentHome as Record<string, string>)[key], locale).format(
    values
  );

describe('streak pluralisation', () => {
  it('writes "1 day" in the singular in English', async () => {
    await renderServerTree(<StudentStreakCard streak={1} />);
    expect(screen.getByText('day')).toBeInTheDocument();
  });

  it('uses the plural for zero and many', async () => {
    await renderServerTree(<StudentStreakCard streak={3} />);
    expect(screen.getByText('days')).toBeInTheDocument();
  });

  it.each([
    [1, 'dzień'],
    [2, 'dni'],
    [5, 'dni'],
  ])('Polish streak of %i reads "%s"', (count, word) => {
    expect(format(plMessages, 'pl', 'days', { count })).toBe(word);
  });

  it('inflects the distance to the next badge', () => {
    expect(format(enMessages, 'en', 'nextBadge', { remaining: 1 })).toBe('1 more day to your');
    expect(format(plMessages, 'pl', 'nextBadge', { remaining: 1 })).toBe(
      'Jeszcze 1 dzień do odznaki'
    );
  });
});

describe('week strip initials', () => {
  const renderWeek = (locale: 'en' | 'pl', messages: typeof enMessages) =>
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <StudentWeekStrip week={weekStrip([], NOW)} label="Week" />
      </NextIntlClientProvider>
    );

  it('shows Polish initials in Polish', () => {
    const { container } = renderWeek('pl', plMessages as unknown as typeof enMessages);
    const text = Array.from(container.querySelectorAll('div[title]')).map(
      (d) => d.children[0].textContent
    );
    expect(text).toEqual(['P', 'W', 'Ś', 'C', 'P', 'S', 'N']);
  });

  it('keeps English initials in English', () => {
    const { container } = renderWeek('en', enMessages);
    const text = Array.from(container.querySelectorAll('div[title]')).map(
      (d) => d.children[0].textContent
    );
    expect(text).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });
});

describe('today read-out without a target', () => {
  it('shows plain minutes instead of "20/0 min"', async () => {
    await renderServerTree(<StudentPracticeSet items={[]} minutesToday={20} lesson={null} />);
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.queryByText('20/0 min')).not.toBeInTheDocument();
  });
});
