import type { Chapter } from './walkthrough.types';

export const chapter10: Chapter = {
  title: 'Powiadomienia i maile',
  lead: 'Każde zdarzenie z pętli (lekcja za 24 godziny, nowe zadanie, zadanie po terminie, lekcja zamknięta) trafia do dzwonka w aplikacji i — jeśli użytkownik tego chce — na e-mail. Siedemnaście typów, każdy z własnym przełącznikiem. Maile poniżej pochodzą ze skrzynki testowej środowiska deweloperskiego, stąd treści „E2E Flow…”.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Ustawienia powiadomień',
          shot: 't-settings-notifications',
          see: 'Zakładki Profil / Powiadomienia / Integracje. „Powiadomienia · Wybierz, jakie powiadomienia i jak chcesz otrzymywać.” Karta <b>Powiadomienia e-mail</b> z głównym przełącznikiem „Wyłącz wszystkie” i linkiem „Wypisz się ze wszystkich powiadomień”; pod nią lista typów.',
          why: 'Jeden główny wyłącznik i lista typów pod nim. Link wypisania działa też z poziomu każdego maila (stopka „Notification settings”).',
          pitch:
            'Nikt nie dostanie maila, którego nie chciał — i widać, który przełącznik to kontroluje.',
        },
        {
          title: 'Skrzynka · pusto',
          shot: 't-notifications',
          see: '„Aktywność · Wszystko na bieżąco.” i jedno zdanie: „Brak powiadomień. Aktualizacje dotyczące lekcji, zadań i ćwiczeń pojawią się tutaj.”',
          why: 'Pusta skrzynka mówi, co się w niej pojawi. Czerwona dwójka na dzwonku w nagłówku to licznik nieprzeczytanych.',
        },
        {
          title: 'Mail · lekcja jutro',
          shot: 'm-reminder',
          see: 'Nagłówek Strummy · Guitar Student Management. „Your next lesson · Dear Flow Student, a friendly reminder about your upcoming guitar lesson”: data „tomorrow”, godzina 10:00, przycisk „View dashboard”. Stopka: „See you soon!”, linki do panelu i ustawień powiadomień.',
          why: 'Wysyłany 24 h przed lekcją przez codzienny harmonogram (test F03.4). Jedna informacja, jeden przycisk.',
          pitch: 'Mniej nieobecności bez wysyłania SMS-ów ręcznie.',
          note: 'Szablony maili są po angielsku; polska wersja czeka na i18n Phase 3.',
        },
        {
          title: 'Mail · podsumowanie lekcji',
          shot: 'm-recap',
          see: "„Lesson summary · Here's a summary of your lesson on May 5”: temat, <b>Teacher's notes</b> („Work on the G chord”), <b>Songs practiced</b> z etapami (Started, To learn), przycisk „View dashboard”, „Keep practicing!”.",
          why: 'Mail po zamknięciu lekcji zawiera notatki i utwory z etapami — to, co uczeń ma mieć pod ręką do następnego razu (test F04.5).',
          pitch: 'Uczeń dostaje notatki z lekcji, zanim dojedzie do domu.',
        },
        {
          title: 'Mail · nowe zadanie',
          shot: 'm-new-assignment',
          see: '„New assignment · Your teacher has given you a new assignment”: karta z tytułem, terminem, nadawcą i plakietką „New”, przycisk „View assignment”, „Good luck with your practice!”.',
          why: 'Wysyłany od razu po utworzeniu zadania; link prowadzi prosto do niego, nie do strony głównej.',
        },
        {
          title: 'Mail · zadanie po terminie',
          shot: 'm-overdue',
          see: "Czerwony akcent: „Assignments · Action needed · An assignment is overdue”. Treść: „now 2 days past its due date. It's not too late to catch up — and your teacher is glad to help if you're stuck.” Karta: termin, dni po terminie 2, plakietka „Overdue”, przycisk „Complete assignment”.",
          why: 'Jedyny mail z czerwienią. Ton jest zachęcający, nie karcący; przycisk prowadzi do oddania zadania.',
          pitch: 'Zaległe przypomina się samo — nauczyciel nie musi być tym, który upomina.',
        },
      ],
    },
    {
      kind: 'text',
      html: '<p><b>Pozostałe typy</b> (bez zrzutów): lekcja odwołana / przełożona, zadanie ukończone (do nauczyciela), utwór opanowany, kamień milowy, powitanie ucznia, dzienne podsumowanie dla nauczyciela, tygodniowy digest, konflikt kalendarza, alerty administracyjne. Maile logowania (zaproszenie, reset hasła, link magiczny) wysyła system kont i mają osobne szablony.</p>',
    },
  ],
};
