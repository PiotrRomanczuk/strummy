import type { Chapter } from './walkthrough.types';

export const chapter05: Chapter = {
  title: 'Utwory — biblioteka i repertuar',
  lead: 'Utwór istnieje w bibliotece raz: akordy nad tekstem, diagramy, tonacja, kapodaster, tempo, linki. Dodanie go do lekcji tworzy wpis w repertuarze ucznia. Biblioteka demo ma ponad dwa tysiące pozycji; filtrowanie i wyszukiwanie są więc na pierwszym planie.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Utwory · biblioteka',
          shot: 't-songs',
          see: '„Utwory · 2026 utworów”, przycisk „+ Nowy utwór” i szare „Oczekujące prośby”. Filtry: poziom (Początkujący 120, Średniozaawansowany 9, Zaawansowany 4), sortowanie (Najnowsze / Najstarsze / Alfabetycznie), tonacja, autor, tytuł; zakładki gatunków (Pop 4, Classic Rock 3). Wiersze z okładką, tytułem, wykonawcą i „0 uczy się”.',
          why: 'Biblioteka rośnie przez lata; liczy się czas do konkretnego utworu. Każdy filtr ma licznik, więc widać, co zawęzi listę, zanim się dotknie.',
          pitch: 'Utwór wpisujesz raz, a potem dopinasz do lekcji każdego ucznia.',
        },
        {
          title: 'Utwory · podgląd w panelu',
          shot: 't-songs-selected',
          see: 'Dotknięcie wiersza wysuwa panel: okładka, „Britpop · 1995 · Wonderwall · Oasis”, kafle tonacja G / kapodaster próg 2 / 87 BPM / 4:18, etykiety, karta „W Twojej bibliotece · Wykorzystanie: przypisany do 7 uczniów, obecny na 12 lekcjach”. Przycisk „Otwórz pełną stronę”.',
          why: 'Szybki podgląd bez opuszczania listy — ten sam wzorzec na komputerze stoi obok listy (rozdział 12).',
          pitch: '„Ilu uczniów to gra” — liczba, której nauczyciel dziś nie ma.',
        },
        {
          title: 'Utwór · strona',
          shot: 't-song-detail',
          see: 'Akcje: Duplikuj, Edytuj, „Zadaj uczniowi”. Metryka utworu, odtwarzacz z prędkością 0,75× i pętlą, zakładki <b>Chwyty i budowa · Tekst · Produkcja</b>; karta „Akordy w utworze Wonderwall”.',
          why: 'Jedna strona na lekcję: diagramy, tekst z akordami, nagranie w zwolnionym tempie. „Zadaj uczniowi” zamienia utwór w zadanie bez przepisywania.',
          pitch: 'Lekcja prowadzona z jednego ekranu zamiast z tabulatury, YouTube i kartki.',
        },
        {
          title: 'Nowy utwór · krok I',
          shot: 't-song-new',
          see: 'Kreator w czterech krokach („Pieśń I · Podstawy”): wyszukiwarka Spotify na górze, pola tytuł, wykonawca, poziom (Początkowy / Początkujący / Średniozaawansowany / Zaawansowany), tonacja, kategoria. Stopka „Wstecz / Dalej”, w nagłówku „Szkic”.',
          why: 'Spotify wypełnia metadane i okładkę; import z Ultimate Guitar (w edycji utworu) wkleja akordy. Ręczne wpisywanie to ostateczność.',
          pitch:
            'Najczęstsza obawa „muszę wklepać całą bibliotekę” — zamknięta wyszukiwarką i importem.',
          note: 'Tytuł kroku „Pieśń I” to niefortunne tłumaczenie „Song I” — do poprawy w słowniku i18n.',
        },
        {
          title: 'Utwory · filtr bez wyników',
          shot: 't-songs-nomatch',
          see: '„0 utworów pasujące do «zzzzzz»”, filtry z zerowymi licznikami i karta „Żaden utwór nie pasuje do bieżących filtrów.”',
          why: 'Pusta lista mówi, dlaczego jest pusta; liczniki przy filtrach pokazują, który zawęził do zera.',
        },
        {
          title: 'Prośby o utwory',
          shot: 't-song-requests',
          see: '„Oczekujące prośby o utwory”: Landslide · Fleetwood Mac, prośba Zofii Nowak z 12.10 z linkiem do YouTube i uzasadnieniem („wydaje się krok dalej niż Blackbird”). Przyciski Odrzuć / Zatwierdź.',
          why: 'Uczeń może poprosić o utwór z własnej strony („Poproś o utwór”). Nauczyciel decyduje jednym dotknięciem; zatwierdzony trafia do repertuaru.',
          pitch: 'Uczeń ma głos w repertuarze, nauczyciel ma ostatnie słowo.',
        },
      ],
    },
  ],
};
