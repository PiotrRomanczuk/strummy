import type { Chapter } from './walkthrough.types';

export const chapter06: Chapter = {
  title: 'Zadania — praca domowa z terminem',
  lead: 'Zadanie to utwór albo ćwiczenie dla jednego lub kilku uczniów, z terminem i celem. Uczeń zmienia status, nauczyciel dostaje powiadomienie, zaległe same się przypominają mailem. Szablony skracają tworzenie powtarzalnych zadań do jednego dotknięcia.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Zadania · lista',
          shot: 't-assignments',
          see: '„Zadania · 8 otwartych · 0 po terminie · 6 ukończonych”, przycisk „Nowe zadanie”. Zakładki Otwarte 8 / Ukończone 6 / Anulowane 0. Wiersze: awatar ucznia, imię, tytuł kursywą, pierwsza linia opisu, status <b>W trakcie</b> (złoty) albo <b>Nierozpoczęte</b> (szary).',
          why: 'Jedna lista dla całego studia, status widoczny bez otwierania. Liczba „po terminie” w nagłówku to pierwsza rzecz, na którą patrzy nauczyciel w poniedziałek.',
          pitch: 'Kto odrobił, kto nie zaczął — bez pytania na lekcji.',
        },
        {
          title: 'Nowe zadanie',
          shot: 't-assignment-new',
          see: '„Nowe zadanie.” Sekcja I · <b>Kto</b>: chipy uczniów (Jakub, Maja, Piotr, Zofia), licznik 0/4. Sekcja II · <b>Co</b>: utwór lub ćwiczenie (lista), opis „Co uczeń powinien zrobić przed kolejną lekcją…”, przycisk „Wygeneruj zadanie” (AI). Na górze „Wyślij zadanie”.',
          why: 'Najpierw komu, potem co, potem kiedy. Jedno zadanie można wysłać czwórce naraz; opis może napisać asystent AI na podstawie utworu i poziomu.',
          pitch: 'Zadanie dla całej grupy w trzech dotknięciach.',
        },
        {
          title: 'Zadanie · szczegół',
          shot: 't-assignment-detail',
          see: '„Blackbird — wstęp palcami” dla Zofii Nowak, termin 16 października. Zakładki W trakcie / View history / Zapisz jako szablon / Edytuj. Karty <b>Opis</b> („Naucz się pierwszych 8 taktów… Sposób zaliczenia · Self-report”) i <b>Postęp</b> z przyciskami „Oznacz jako ukończone” i „Anuluj zadanie”.',
          why: 'Nauczyciel widzi to samo, co uczeń, plus historię zmian statusu. „Zapisz jako szablon” zamienia dobre zadanie w gotowiec.',
          pitch: 'Sposób zaliczenia jest jawny: samoocena ucznia albo potwierdzenie na lekcji.',
          note: '„View history” w zakładkach i format daty („Friday, October 16, 2026”) są po angielsku.',
        },
        {
          title: 'Szablony',
          shot: 't-assignment-templates',
          see: '„Szablony” z przyciskiem „+ Nowy szablon” i pustym stanem: „Brak szablonów. Zapisz powtarzające się zadanie jako szablon, aby użyć go ponownie jednym kliknięciem.”',
          why: 'Pusty stan tłumaczy, skąd biorą się szablony — z istniejących zadań, nie z osobnego formularza.',
        },
      ],
    },
    {
      kind: 'text',
      html: '<p><b>Co dzieje się po stronie ucznia</b> — rozdział 8: lista „Od Twojego nauczyciela”, szczegół z „Oznacz jako ukończone”, a po terminie mail „An assignment is overdue” (rozdział 10).</p>',
    },
  ],
};
