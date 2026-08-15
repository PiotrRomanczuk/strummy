/**
 * Locale behavior for the pilot email templates (lesson-reminder, lesson-recap,
 * assignment-due-reminder) plus the base template chrome. Everything else
 * still defaults to English until ported — see lib/email/templates/i18n.ts.
 */

import { generateBaseEmailHtml } from '../base-template';
import { generateLessonReminderHtml } from '../lesson-reminder';
import { generateLessonRecapHtml } from '../lesson-recap';
import { generateAssignmentDueReminderHtml } from '../assignment-due-reminder';

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV };
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe('email locale support', () => {
  it('generateBaseEmailHtml defaults to English chrome', () => {
    const html = generateBaseEmailHtml({ subject: 'Test', bodyContent: '<p>x</p>' });

    expect(html).toContain('<html lang="en"');
    expect(html).toContain('Guitar Student Management');
    expect(html).toContain('View Dashboard');
    expect(html).toContain('Notification Settings');
    expect(html).toContain("You're receiving this email because you have an account with Strummy.");
  });

  it('generateBaseEmailHtml translates the chrome for locale "pl"', () => {
    const html = generateBaseEmailHtml({
      subject: 'Test',
      bodyContent: '<p>x</p>',
      locale: 'pl',
      ctaButton: { text: 'Zobacz', url: 'https://example.com' },
    });

    expect(html).toContain('<html lang="pl"');
    expect(html).toContain('Zarządzanie uczniami gitary');
    expect(html).toContain('Przejdź do panelu');
    expect(html).toContain('Ustawienia powiadomień');
    expect(html).toContain('Otrzymujesz tę wiadomość, ponieważ masz konto w Strummy.');
    expect(html).toContain('Wszelkie prawa zastrzeżone');
  });

  it('generateLessonReminderHtml renders Polish copy end-to-end for locale "pl"', () => {
    const html = generateLessonReminderHtml({
      studentName: 'Emma',
      lessonDate: '6 sierpnia 2026',
      lessonTime: '16:30',
      location: 'Studio A',
      agenda: 'Akordy barowe',
      locale: 'pl',
    });

    expect(html).toContain('<title>Przypomnienie o nadchodzącej lekcji</title>');
    expect(html).toContain('Cześć Emma,');
    expect(html).toContain('Twoja najbliższa lekcja');
    expect(html).toContain('Data');
    expect(html).toContain('Godzina');
    expect(html).toContain('Miejsce');
    expect(html).toContain('Plan zajęć');
    expect(html).toContain('Przejdź do panelu');
    expect(html).toContain('Do zobaczenia wkrótce!');
  });

  it('generateLessonReminderHtml stays in English by default', () => {
    const html = generateLessonReminderHtml({
      studentName: 'Emma',
      lessonDate: 'August 6, 2026',
      lessonTime: '4:30 PM',
    });

    expect(html).toContain('Dear Emma,');
    expect(html).toContain('Your next lesson');
  });

  it('generateLessonRecapHtml renders Polish copy for locale "pl"', () => {
    const html = generateLessonRecapHtml({
      studentName: 'Emma',
      lessonDate: '1 sierpnia 2026',
      lessonTitle: 'Wprowadzenie do bluesa',
      notes: 'Świetny postęp!',
      songs: [{ title: 'Blackbird', artist: 'The Beatles', status: 'Mastered' }],
      locale: 'pl',
    });

    expect(html).toContain('Podsumowanie lekcji');
    expect(html).toContain('Temat');
    expect(html).toContain('Notatki nauczyciela');
    expect(html).toContain('Utwory ćwiczone na lekcji');
    expect(html).toContain('Ćwicz dalej!');
  });

  it('generateAssignmentDueReminderHtml renders Polish copy for locale "pl"', () => {
    const html = generateAssignmentDueReminderHtml({
      studentName: 'Emma',
      assignmentTitle: 'Ćwicz przejścia akordów barowych',
      dueDate: '10 sierpnia 2026',
      assignmentLink: 'https://example.com/dashboard/assignments/1',
      locale: 'pl',
    });

    expect(html).toContain('Zbliża się termin zadania');
    expect(html).toContain('Cześć Emma,');
    expect(html).toContain('Termin');
    expect(html).toContain('Zbliża się termin');
    expect(html).toContain('Zobacz zadanie');
    expect(html).toContain('Tak trzymaj!');
    expect(html).toContain(
      '<title>Zadanie wkrótce mija termin: Ćwicz przejścia akordów barowych</title>'
    );
  });
});
