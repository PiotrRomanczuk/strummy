/**
 * Email translation dictionary.
 *
 * Separate from the app's `messages/*.json` (next-intl) on purpose — emails
 * are generated server-side with no request/cookie context, and transactional
 * copy needs its own register (more formal "Dear {name}," vs. an in-app
 * toast). Only the base template chrome and the templates listed in
 * `PILOT_TEMPLATES` below are translated so far; everything else defaults to
 * English until ported. See lib/email/templates/README (scope note in the
 * 2026-08-03 email-redesign-v2 PR) for the rollout plan.
 */

import type { AppLocale } from '@/i18n/locales';

/** Templates with real Polish copy today — expand as more are ported. */
export const PILOT_TEMPLATES = [
  'lesson_reminder_24h',
  'lesson_recap',
  'assignment_due_reminder',
] as const;

export const emailChrome = {
  en: {
    tagline: 'Guitar Student Management',
    viewDashboard: 'View Dashboard',
    notificationSettings: 'Notification Settings',
    receivingBecause: "You're receiving this email because you have an account with Strummy.",
    allRightsReserved: 'All rights reserved',
  },
  pl: {
    tagline: 'Zarządzanie uczniami gitary',
    viewDashboard: 'Przejdź do panelu',
    notificationSettings: 'Ustawienia powiadomień',
    receivingBecause: 'Otrzymujesz tę wiadomość, ponieważ masz konto w Strummy.',
    allRightsReserved: 'Wszelkie prawa zastrzeżone',
  },
} as const;

export function greeting(locale: AppLocale, name: string): string {
  return locale === 'pl' ? `Cześć ${name},` : `Dear ${name},`;
}

export const lessonReminder = {
  en: {
    subject: 'Upcoming Lesson Reminder',
    kicker: 'Lessons',
    heading: 'Your next lesson',
    intro: 'A friendly reminder about your upcoming guitar lesson &mdash; here are the details.',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    agenda: 'Planned agenda',
    cta: 'View Dashboard',
    footerNote: 'See you soon!',
  },
  pl: {
    subject: 'Przypomnienie o nadchodzącej lekcji',
    kicker: 'Lekcje',
    heading: 'Twoja najbliższa lekcja',
    intro: 'Przypominamy o nadchodzącej lekcji gry na gitarze &mdash; oto szczegóły.',
    date: 'Data',
    time: 'Godzina',
    location: 'Miejsce',
    agenda: 'Plan zajęć',
    cta: 'Przejdź do panelu',
    footerNote: 'Do zobaczenia wkrótce!',
  },
} as const;

export const lessonRecap = {
  en: {
    kicker: 'Lessons',
    heading: 'Lesson summary',
    intro: (date: string) => `Here's a summary of your lesson on <strong>${date}</strong>.`,
    topic: 'Topic',
    teacherNotes: "Teacher's notes",
    songsPracticed: 'Songs practiced',
    cta: 'View Dashboard',
    footerNote: 'Keep practicing!',
  },
  pl: {
    kicker: 'Lekcje',
    heading: 'Podsumowanie lekcji',
    intro: (date: string) => `Oto podsumowanie Twojej lekcji z dnia <strong>${date}</strong>.`,
    topic: 'Temat',
    teacherNotes: 'Notatki nauczyciela',
    songsPracticed: 'Utwory ćwiczone na lekcji',
    cta: 'Przejdź do panelu',
    footerNote: 'Ćwicz dalej!',
  },
} as const;

export const assignmentDueReminder = {
  en: {
    subject: (title: string) => `Assignment Due Soon: ${title}`,
    kicker: 'Assignments',
    heading: 'Assignment due soon',
    intro:
      'This is a friendly reminder that you have an assignment due soon. Make sure to complete it before the deadline!',
    dueDate: 'Due date',
    dueSoon: 'Due soon',
    outro:
      'Make sure to practice and complete all the tasks before the deadline. If you need help or have questions, reach out to your teacher!',
    cta: 'View Assignment',
    footerNote: 'Keep up the great work!',
  },
  pl: {
    subject: (title: string) => `Zadanie wkrótce mija termin: ${title}`,
    kicker: 'Zadania',
    heading: 'Zbliża się termin zadania',
    intro:
      'Przypominamy, że zbliża się termin wykonania jednego z Twoich zadań. Postaraj się ukończyć je przed terminem!',
    dueDate: 'Termin',
    dueSoon: 'Zbliża się termin',
    outro:
      'Pamiętaj o ćwiczeniach i wykonaniu wszystkich zadań przed terminem. Jeśli potrzebujesz pomocy, skontaktuj się z nauczycielem!',
    cta: 'Zobacz zadanie',
    footerNote: 'Tak trzymaj!',
  },
} as const;
