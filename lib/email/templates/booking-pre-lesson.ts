/**
 * Booking Pre-Lesson Email Template
 *
 * Sent once, right after a new person books their first lesson through Cal.com:
 * a link to the warm-up lesson that matches the level they declared in the booking form.
 * The recipient has no Strummy account yet — the invite comes after the first lesson.
 */

import {
  generateBaseEmailHtml,
  createKicker,
  createSectionHeading,
  createGreeting,
  createParagraph,
  createCardSection,
  createDetailRow,
} from './base-template';

export type BookingPreLessonData = {
  name: string;
  /** Already formatted in Polish, e.g. "wtorek, 3 listopada, 18:30". */
  lessonDate: string;
  levelName: string;
  preLessonUrl: string;
  chooseLevelUrl: string;
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function generateBookingPreLessonHtml(data: BookingPreLessonData): string {
  // The name comes straight from a public booking form.
  const name = escapeHtml(data.name.trim().split(/\s+/)[0] ?? '');

  const bodyContent = `
    ${createKicker('Przed pierwszą lekcją')}
    ${createSectionHeading('Do zobaczenia na lekcji gitary')}
    ${createGreeting(name, 'pl')}
    ${createParagraph(
      'Dziękuję za zapis! Żeby pierwsza lekcja od razu poszła w granie, przygotowałem krótką lekcję wstępną dopasowaną do poziomu z formularza rezerwacji. Wystarczy 15 minut dziennie do naszego spotkania.'
    )}
    ${createCardSection(`
      ${createDetailRow('Termin', escapeHtml(data.lessonDate))}
      ${createDetailRow('Miejsce', 'ul. Szwedzka, Praga-Północ (metro M2 Szwedzka)')}
      ${createDetailRow('Twój poziom', escapeHtml(data.levelName))}
    `)}
    ${createParagraph(
      `Poziom nie pasuje? <a href="${data.chooseLevelUrl}" style="color: inherit;">Wybierz inny</a>. Termin przełożysz z maila z potwierdzeniem rezerwacji.`
    )}
  `;

  return generateBaseEmailHtml({
    subject: 'Twoja lekcja wstępna przed pierwszymi zajęciami',
    preheader: '15 minut dziennie, żeby pierwsza lekcja od razu poszła w granie',
    bodyContent,
    footerNote: 'Do zobaczenia — Piotr',
    locale: 'pl',
    receivingBecause: 'Otrzymujesz tę wiadomość, bo zarezerwowałeś(-aś) lekcję gitary przez Cal.com. To jednorazowy mail.',
    ctaButton: { text: 'Otwórz lekcję wstępną', url: data.preLessonUrl },
  });
}
