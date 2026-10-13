import type { Chapter } from './walkthrough.types';

export const chapter11: Chapter = {
  title: 'Stany — pusto, nie znaleziono, błąd',
  lead: 'Pusty ekran zawsze ma zdanie i wyjście. Błędny adres dostaje stronę 404 z powrotem do panelu. Błąd serwera dostaje własną stronę w każdej sekcji panelu zamiast białego ekranu. Czego nie ma: trybu offline — aplikacja potrzebuje sieci.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Nie znaleziono',
          shot: 'st-not-found',
          see: "„404 · Page not found · The page you're looking for doesn't exist or has been moved.” i przycisk „Go to Dashboard”.",
          why: 'Ten sam ekran dostaje uczeń, który wpisze adres cudzej lekcji — baza zwraca „brak wiersza”, aplikacja mówi „nie ma”. Nie zdradza, że coś istnieje.',
          pitch: 'Odpowiedź na „a czy uczeń może podejrzeć innych?” — nie, i tak to wygląda.',
          note: 'Strona 404 jest po angielsku.',
        },
        {
          title: 'Mail zaproszenia · surowy szablon',
          shot: 'm-invite',
          see: '„You have been invited · You have been invited to create a user on http://127.0.0.1:3000 · Accept the invite · Alternatively, enter the code: 477348”. Czarny tekst na białym, bez nagłówka Strummy.',
          why: 'Tak wygląda zaproszenie, gdy system kont nie ma podpiętych szablonów z aplikacji — czyli na świeżo postawionym środowisku. Produkcja ma własny szablon i właściwy adres.',
          note: 'Pułapka operacyjna: restart stosu Supabase przywraca ten surowy szablon i adres 127.0.0.1 — runbook <i>supabase-stack-restart</i>. Do sprawdzenia po każdym restarcie produkcji.',
        },
      ],
    },
    {
      kind: 'table',
      head: ['Gdzie', 'Co mówi pusty ekran', 'Wyjście'],
      widths: ['24%', '48%', '28%'],
      rows: [
        ['Lekcje · nauczyciel', '„Brak lekcji. Zaplanuj pierwszą…”', 'Przycisk „Nowa lekcja”'],
        ['Lekcje · uczeń', '„Nie masz jeszcze żadnych zaplanowanych lekcji.”', '—'],
        [
          'Utwory',
          '„Brak utworów w bibliotece…” / „Żaden utwór nie pasuje do bieżących filtrów.”',
          'Nowy utwór / wyczyść filtr',
        ],
        ['Zadania · uczeń', '„Żadnych zadań na Twoim biurku. Ciesz się spokojem.”', '—'],
        ['Zadania · nauczyciel', '„Brak zadań. Skorzystaj z «Nowe zadanie»…”', 'Nowe zadanie'],
        [
          'Szablony',
          '„Brak szablonów. Zapisz powtarzające się zadanie jako szablon…”',
          'Z poziomu zadania',
        ],
        [
          'Repertuar',
          '„Twój repertuar jest pusty. Utwory pojawią się tutaj, gdy nauczyciel je przypisze.”',
          'Biblioteka → „Chcę się nauczyć”',
        ],
        ['Ćwiczenia', '„Brak zarejestrowanych sesji ćwiczeń…”', 'Formularz nad listą'],
        [
          'Umiejętności · quiz',
          '„Zagraj rundę, a najczęściej mylone akordy pojawią się tutaj.”',
          'Start',
        ],
        [
          'Moje umiejętności',
          '„Nauczyciel nie zapisał jeszcze żadnych umiejętności. Pojawią się tutaj po najbliższej lekcji.”',
          '—',
        ],
        [
          'Powiadomienia',
          '„Brak powiadomień. Aktualizacje dotyczące lekcji, zadań i ćwiczeń pojawią się tutaj.”',
          '—',
        ],
        [
          'Dom ucznia',
          '„Brak zaplanowanej lekcji” + pusty zestaw / pusty repertuar',
          'Praktyka / biblioteka',
        ],
      ],
    },
    {
      kind: 'text',
      html: '<p><b>Błędy i ładowanie.</b> Każda sekcja panelu (lekcje, utwory, zadania, uczniowie, kalendarz, ćwiczenia, repertuar, quiz) ma własną stronę błędu i szkielet ładowania, więc awaria jednej nie zdejmuje nawigacji. <b>Offline</b>: brak — nie ma pracownika usługowego ani kolejki zapisów; aplikację da się przypiąć do ekranu (manifest PWA), ale wymaga sieci. Dla lekcji w sali to zwykle wystarcza; dla „zeszytu w plenerze” — nie, i nie udajemy inaczej.</p>',
    },
  ],
};
