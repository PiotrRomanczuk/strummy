import type { Chapter } from './walkthrough.types';

export const chapter02: Chapter = {
  title: 'Dom nauczyciela — pierwszy ekran',
  lead: 'Ekran, który nauczyciel otwiera między lekcjami, w tramwaju i pięć minut przed uczniem. Odpowiada na jedno pytanie: co teraz? Następna lekcja z przyciskiem przygotowania, dzisiejszy plan, tydzień w liczbach. Reszta jest jedno dotknięcie dalej.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Dom · przed lekcją',
          shot: 't-home',
          see: 'Wtorek 13 października, „Cześć, Anna”. Karta <b>Next · in 46m</b>: Zofia Nowak, 11:00–11:45, czarny przycisk „Open lesson prep”. Pod nią oś dnia: jedna lekcja, 45 minut. Niżej gęstość tygodnia 42 — siedem dni z kropkami lekcji (8 lekcji · 6 h · 15 % wykorzystania) i porównanie z zeszłym tygodniem: godziny +1,5, ćwiczenia uczniów −3,4, utworów zadanych 14. Niżej (poza kadrem): aktywni uczniowie z datą ostatniej lekcji, biblioteka i karta „wymaga uwagi”.',
          why: 'Najczęstsze pytanie nauczyciela to nie „jaki mam grafik”, tylko „kto zaraz przyjdzie i od czego zacząć”. Przycisk przygotowania prowadzi do historii tego ucznia, ostatnich notatek i zaległych zadań.',
          pitch: 'Pięć minut przed lekcją jedno dotknięcie zamiast kartkowania zeszytu.',
          note: 'Nagłówki tego ekranu („Next”, „Today”, „Week · Studio · Library”, „Open lesson prep”) są jeszcze po angielsku — tylko powitanie jest po polsku.',
        },
        {
          title: 'Dom · menu',
          shot: 't-home-more',
          see: 'Wysunięta nawigacja: <b>Nauczanie</b> (Panel, Lekcje, Utwory, Zadania), <b>Uczniowie</b>, <b>Narzędzia</b> (Kalendarz, Gryf, Umiejętności, Asystent AI). Na dole konto: Anna Kowalska · Nauczyciel i wylogowanie.',
          why: 'Menu ma dziewięć pozycji, nie dwadzieścia. Wszystko, co nie działa od końca do końca (teoria, statystyki, kohorty), jest ukryte, nie „wkrótce”.',
          pitch: 'Całą aplikację da się objaśnić jednym zdaniem na pozycję menu.',
        },
      ],
    },
  ],
};
