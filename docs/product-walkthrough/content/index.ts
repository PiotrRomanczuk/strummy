import type { Doc } from './walkthrough.types';
import { chapter01 } from './01-o-co-chodzi';
import { chapter02 } from './02-dom-nauczyciela';
import { chapter03 } from './03-pierwsze-uruchomienie';
import { chapter04 } from './04-lekcje';
import { chapter05 } from './05-utwory';
import { chapter06 } from './06-zadania';
import { chapter07 } from './07-uczniowie';
import { chapter08 } from './08-ekrany-ucznia';
import { chapter09 } from './09-umiejetnosci';
import { chapter10 } from './10-powiadomienia';
import { chapter11 } from './11-stany';
import { chapter12 } from './12-komputer-tablet';
import { chapter13 } from './13-zasady';
import { chapter14 } from './14-pytania';
import { chapter15 } from './15-slownik';

/** Output filename stem (dated: a point-in-time document, per the docs rules). */
export const OUTPUT_BASENAME = '2026-10-13-strummy-przewodnik-po-ekranach';

export const DOC: Doc = {
  kicker:
    'Strummy · <b>Przewodnik po ekranach</b> · materiał do demo i sprzedaży · wydanie 1 · 13.10.2026',
  product: 'Strummy',
  productSuffix: '.online',
  title: 'Przewodnik po ekranach',
  intro:
    'Aplikacja dla nauczyciela gitary, która robi jedną rzecz dobrze: pamięta lekcje, utwory i zadania za nauczyciela i ucznia — na telefonie, na lekcji i między lekcjami. Ten dokument pokazuje każdy ekran, tłumaczy, po co jest, i co powiedzieć, pokazując go.',
  status: {
    label: 'Stan prac.',
    html: 'Aplikacja działa produkcyjnie (strummy.online, publiczna beta). Podstawowe przepływy F01–F11 mają automatyczne testy od końca do końca i są zielone od 2026-10-12. Zrzuty w tym dokumencie pochodzą z działającej aplikacji (środowisko deweloperskie, dane demonstracyjne), nie z makiet. Część napisów w panelu nauczyciela jest jeszcze po angielsku — tłumaczenie trwa; takie miejsca są oznaczone <b>Uwaga</b>.',
  },
  demoNote:
    'Dane na ekranach są demonstracyjne: studio Anny Kowalskiej, wtorek 13 października 2026, tydzień 42; uczniowie Zofia Nowak, Jakub Wiśniewski, Maja Lewandowska, Piotr Zieliński. Nazwy osób są zmyślone.',
  chapters: [
    chapter01,
    chapter02,
    chapter03,
    chapter04,
    chapter05,
    chapter06,
    chapter07,
    chapter08,
    chapter09,
    chapter10,
    chapter11,
    chapter12,
    chapter13,
    chapter14,
    chapter15,
  ],
  footer:
    'Strummy · Przewodnik po ekranach · wydanie 1 (13.10.2026) · źródło: docs/product-walkthrough/content · zrzuty: tests/e2e/manual/product-walkthrough.spec.ts · dokument wygenerowany skryptem scripts/docs/walkthrough/build.ts',
};
