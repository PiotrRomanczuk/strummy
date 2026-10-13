import type { Chapter } from './walkthrough.types';

export const chapter04: Chapter = {
  title: 'Lekcje — plan, lekcja, kalendarz',
  lead: 'Lekcja to spotkanie z datą, uczniem i statusem. Ma utwory, etap pracy nad nimi i notatki, które uczeń widzi natychmiast. Seria „co tydzień” powstaje z jednego formularza. Statusy są jawne: zaplanowana, w trakcie, zakończona, odwołana; po terminie bez zamknięcia — zaległa.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Lekcje · lista',
          shot: 't-lessons',
          see: '„Lekcje · 40 lekcji”, przycisk „+”, chipy <b>Wszystkie / Zaplanowana / Zakończona / Odwołana</b>. Karty pogrupowane datami (16.10 piątek: #11 11:00 „Hotel California w całości” · Jakub Wiśniewski · 0 utworów · <b>Zaplanowana</b>…). Numer lekcji, godzina, tytuł, uczeń, liczba utworów, status.',
          why: 'Lista jest jedna dla całego studia i czyta się ją jak kalendarz: data jako separator, status jako kolor. Numer lekcji jest wspólny dla nauczyciela i ucznia.',
          pitch: 'Cały semestr w jednym przewijanym widoku, bez wchodzenia w każdy dzień.',
          note: 'W danych demo lekcje z bieżącego tygodnia nie mają dopiętych utworów (starsze mają po dwa) — stąd „0 utworów” na pierwszym ekranie. To luka seeda, nie aplikacji.',
        },
        {
          title: 'Lekcje · tylko zakończone',
          shot: 't-lessons-completed',
          see: 'Chip „Zakończona” aktywny: „34 lekcje”, same zielone statusy — 12.10 „Szybkość zmian akordów” (Piotr Zieliński), „Blackbird palcami” (Maja Lewandowska), 11.10 „Improwizacja dalszy ciąg”…',
          why: 'Filtr zmienia licznik w nagłówku i adres strony, więc widok da się wysłać linkiem albo wrócić do niego z historii.',
        },
        {
          title: 'Lekcja · szczegół',
          shot: 't-lesson-detail',
          see: '„Lekcja #11” z ołówkiem edycji. Duża data <b>16 · paź · pt</b>, status Zaplanowana, tytuł „Hotel California w całości”, 11:00, karta ucznia Jakub Wiśniewski, sekcja <b>Notatki</b>: „Hotel California w całości — zwrotka i solówka”.',
          why: 'Notatka jest widoczna przed lekcją (plan) i po (co było). Ten sam ekran widzi uczeń, bez przycisku edycji.',
          pitch: 'Notatka napisana raz służy obu stronom.',
        },
        {
          title: 'Zaplanuj lekcję',
          shot: 't-lesson-new',
          see: '„Zaplanuj lekcję.” — akordeon: I · <b>Kto i kiedy</b> (uczeń jako chipy: Jakub, Maja, Piotr, Zofia + „Nowy uczeń przez e-mail…”, data, godzina, czas trwania 45 min), II · <b>Miejsce i powtarzanie</b>, dalej utwory i notatki. Licznik wypełnienia 1/4 przy sekcji.',
          why: 'Ucznia wybiera się dotknięciem, nie z listy rozwijanej. „Nowy uczeń przez e-mail” pozwala zaplanować pierwszą lekcję komuś, kogo jeszcze nie ma w systemie — zaproszenie idzie razem z lekcją.',
          pitch: 'Pierwsza lekcja nowego ucznia i jego zaproszenie to jeden formularz.',
        },
        {
          title: 'Edytuj lekcję',
          shot: 't-lesson-edit',
          see: 'Ten sam formularz z danymi: data 16/10/2026, 11:00, 45 min (sekcja I · 3/3). Sekcja II · <b>Forma</b>: Stacjonarnie / Rozmowa wideo, status. Niżej (poza kadrem) utwory z etapami i notatki. Przycisk „Zapisz zmiany”.',
          why: 'Po lekcji nauczyciel zmienia status na „zakończona”, ustawia etap utworów i dopisuje notatkę — i to uruchamia mail z podsumowaniem (rozdział 10).',
          pitch: 'Zamknięcie lekcji = notatka dla ucznia wysłana automatycznie.',
        },
        {
          title: 'Kalendarz',
          shot: 't-calendar',
          see: '„Kalendarz · Twoje lekcje w jednym miejscu. Kliknij lekcję, aby ją otworzyć.” Siatka miesiąca (October 2026) z zaznaczonym dziś (13), nawigacja ‹ Dziś ›. Pod spodem karta integracji „Kalendarz Google · Planowanie”.',
          why: 'Widok miesiąca dla planowania; lista z rozdziału wyżej do pracy dzień po dniu. Integracja z Google jest tu podpięta, ale uśpiona.',
          note: 'Nazwa miesiąca („October 2026”) jest po angielsku mimo polskich nagłówków dni.',
        },
      ],
    },
    {
      kind: 'text',
      html: '<p><b>Powtarzanie co tydzień.</b> W sekcji „Miejsce i powtarzanie” jedno przełączenie tworzy serię lekcji o tej samej porze; każda z nich jest potem osobną lekcją z własnym statusem i notatkami (test F03.2). <b>Przygotowanie do lekcji</b> („Open lesson prep” z Domu) zbiera na jednej stronie ostatnie notatki ucznia, jego repertuar i otwarte zadania.</p>',
    },
  ],
};
