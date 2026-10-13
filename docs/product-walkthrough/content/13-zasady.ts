import type { Chapter } from './walkthrough.types';

export const chapter13: Chapter = {
  title: 'Dlaczego tak wygląda — osiem zasad',
  lead: 'Projekt przeszedł w 2026 roku przez jedną dużą przebudowę: z trzech równoległych generacji interfejsu została jedna. Te zasady to nie manifest — każda ma miejsce w kodzie, gdzie jest pilnowana, i ekran, na którym da się ją pokazać.',
  blocks: [
    {
      kind: 'table',
      head: ['Zasada', 'Co to znaczy w aplikacji', 'Gdzie pokazać'],
      widths: ['22%', '50%', '28%'],
      rows: [
        [
          '1 · Dzień przed wszystkim',
          'Pierwszy ekran odpowiada na „co teraz?”: następna lekcja z przyciskiem przygotowania, dziś, kto wymaga uwagi. Reszta jest jedno dotknięcie dalej.',
          'Dom · nauczyciel, Dom · uczeń',
        ],
        [
          '2 · Lekcja jest zapisem',
          'Lekcja ma utwory, etap pracy, notatki i zadanie. To, co nauczyciel zapisze po lekcji, uczeń widzi natychmiast — i dostaje mailem.',
          'Lekcja · szczegół, Moja lekcja',
        ],
        [
          '3 · Jedna biblioteka, wiele repertuarów',
          'Utwór istnieje raz. Dodanie go do lekcji tworzy wpis w repertuarze ucznia z własnym etapem i samooceną.',
          'Utwór · szczegół, Repertuar',
        ],
        [
          '4 · Baza jest granicą',
          'Kto co widzi, decyduje Postgres (RLS), nie interfejs. Uczeń pisze tylko przez kontrolowane funkcje. Jest na to test, który próbuje czytać cudze dane.',
          'Rozdział „Pytania” · bezpieczeństwo',
        ],
        [
          '5 · Puste stany z wyjściem',
          'Pusto zawsze mówi, co zrobić: „Zaplanuj pierwszą lekcję”, „Żaden utwór nie pasuje do filtrów”, „Zagraj rundę”.',
          'Rozdział „Stany”',
        ],
        [
          '6 · Jedna generacja interfejsu',
          'Jeden zestaw tokenów (kość słoniowa, atrament, złoto), jedna typografia, tryb ciemny z tych samych tokenów. Trzy wcześniejsze generacje zostały usunięte, nie zarchiwizowane.',
          'Każdy ekran obok każdego',
        ],
        [
          '7 · Telefon najpierw',
          'Każdy ekran jest projektowany od 390 px w górę; komputer dostaje listę i szczegół obok siebie, nie inny produkt.',
          'Rozdział „Komputer i tablet”',
        ],
        [
          '8 · Mniej, ale prawdziwe',
          'Funkcja, która nie działa od końca do końca, jest ukryta z nawigacji, nie pokazana jako „wkrótce”. Ukryte dziś: teoria (brak treści), statystyki, kohorty.',
          'Menu „Więcej”',
        ],
      ],
    },
    {
      kind: 'text',
      html: '<p><b>Co z tego wynika dla rozmowy.</b> Nie trzeba obiecywać. Każda z ośmiu zasad ma ekran w tym dokumencie; wystarczy go otworzyć.</p>',
    },
  ],
};
