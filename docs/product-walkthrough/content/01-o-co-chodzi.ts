import type { Chapter } from './walkthrough.types';

export const chapter01: Chapter = {
  title: 'O co w tym chodzi',
  lead: 'Strummy to system dla nauczyciela gitary: lekcje, utwory, zadania domowe, uczniowie. Zrobiony przez jednego nauczyciela dla własnego studia i prowadzony na prawdziwych lekcjach. To nie jest „platforma e-learningowa” — to narzędzie do jednej pętli: nauczyciel planuje, uczeń widzi i ćwiczy, nauczyciel widzi, co z tego wyszło.',
  blocks: [
    {
      kind: 'callout',
      html: 'Jedno zdanie nauczyciela: <b>„Nigdy więcej nie zastanawiam się, co robiliśmy ostatnim razem.”</b>',
    },
    {
      kind: 'list',
      title: 'Dla kogo',
      items: [
        'Nauczyciel gitary z 5–30 uczniami, uczący prywatnie albo w małej szkole; lekcje indywidualne, co tydzień.',
        'Dziś: kalendarz w telefonie, notatki w zeszycie albo w czacie, zdjęcia tabulatur, „co zadałem?” z pamięci.',
        'Nie chce administracji; chce wiedzieć, kto przychodzi dziś, co graliśmy ostatnio i czy uczeń ćwiczył.',
        'Uczeń (często nastolatek) i rodzic, który chce wiedzieć, czy lekcje coś dają.',
      ],
    },
    {
      kind: 'list',
      title: 'Co dostaje',
      items: [
        '<b>Dom</b> — dzień nauczyciela na jednym ekranie: następna lekcja, kto wymaga uwagi, tydzień w liczbach.',
        '<b>Lekcje</b> — plan, statusy, powtarzanie co tydzień; do każdej lekcji utwory, etap pracy nad nimi i notatki.',
        '<b>Biblioteka utworów</b> — akordy nad tekstem, diagramy, linki do UG, YouTube i Spotify; dodanie utworu do lekcji buduje repertuar ucznia.',
        '<b>Zadania</b> — praca domowa z terminem; uczeń odhacza, nauczyciel dostaje powiadomienie, zaległe same się przypominają.',
        '<b>Uczniowie</b> — lista, profil z historią lekcji, repertuarem i ćwiczeniami; dodanie przez e-mail wysyła zaproszenie od razu.',
        '<b>Strona ucznia</b> — moje lekcje, moje zadania, mój repertuar, dziennik ćwiczeń, umiejętności, quiz akordów, gryf.',
        '<b>Powiadomienia i maile</b> — przypomnienie 24 h przed lekcją, podsumowanie po lekcji, nowe i zaległe zadania; każdy typ do wyłączenia osobno.',
        '<b>Telefon, tablet, komputer</b> — ta sama aplikacja w przeglądarce, do przypięcia na ekranie jak zwykła aplikacja.',
      ],
    },
    {
      kind: 'list',
      title: 'Czego NIE ma (i dlaczego)',
      items: [
        '<b>Płatności i faktur.</b> Rozliczenia zostają tam, gdzie są. Strummy liczy lekcje, nie pieniądze.',
        '<b>Wielu nauczycieli w jednym studiu.</b> Role są trzy (administrator, nauczyciel, uczeń), ale produkt jest robiony pod jedno studio jednego nauczyciela; drugi nauczyciel to osobna decyzja.',
        '<b>Trybu bez zasięgu.</b> Aplikacja działa w przeglądarce i potrzebuje sieci. Na lekcji sieć zwykle jest.',
        '<b>Automatycznego kalendarza.</b> Synchronizacja z Google Calendar i rezerwacje przez Cal.com są zbudowane, ale uśpione — włączane dopiero, gdy ktoś ich realnie potrzebuje.',
        '<b>Grywalizacji i kursów wideo.</b> Świadomie: najpierw zaufanie do podstawowej pętli, potem dodatki.',
      ],
    },
    {
      kind: 'table',
      head: ['Krok', 'Co robi nauczyciel', 'Co widzi uczeń', 'Co z tego jest'],
      widths: ['14%', '32%', '30%', '24%'],
      rows: [
        [
          '1 · Lekcja',
          'Planuje lekcję (albo serię co tydzień), dopina utwory.',
          'Następną lekcję na Domu i w Moich lekcjach; mail 24 h przed.',
          'Jeden kalendarz prawdy.',
        ],
        [
          '2 · Po lekcji',
          'Zamyka lekcję: etap utworu, notatka, zadanie domowe.',
          'Notatki z lekcji, repertuar z etapami, zadanie z terminem; mail z podsumowaniem.',
          'Koniec „co robiliśmy ostatnio?”.',
        ],
        [
          '3 · W tygodniu',
          'Nic — patrzy, czy ktoś wymaga uwagi.',
          'Loguje ćwiczenia, odhacza zadanie, robi quiz akordów.',
          'Dane o ćwiczeniu zamiast deklaracji.',
        ],
        [
          '4 · Następna lekcja',
          'Otwiera przygotowanie: historia, ostatnie notatki, zaległe zadania.',
          '—',
          'Lekcja zaczyna się od sedna, nie od przypominania.',
        ],
      ],
    },
    {
      kind: 'text',
      html: '<p><b>Najważniejsze technicznie.</b> Jedna baza (Postgres z regułami dostępu na poziomie wierszy), jedna aplikacja (Next.js) i jedno wdrożenie. Uczeń nigdy nie widzi danych innego ucznia — pilnuje tego baza, nie interfejs, i jest na to automatyczny test. Historia lekcji zostaje: zamknięte lekcje da się oglądać latami.</p>',
    },
  ],
};
