import type { Chapter } from './walkthrough.types';

export const chapter08: Chapter = {
  title: 'Ekrany ucznia',
  lead: 'Uczeń widzi tylko swoje: następną lekcję, dzisiejszą praktykę, zadania od nauczyciela, repertuar z etapami i dziennik ćwiczeń. Nic z tego nie wymaga tłumaczenia — każdy ekran zaczyna się od jednej rzeczy do zrobienia.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Dom ucznia',
          shot: 's-home',
          see: '„Cześć, Zofia”. Karta „Lekcja z: Anna Kowalska · <b>za 0h 44m</b> · 11:00” i przycisk „Zacznij dzisiejszą praktykę”. Karta <b>Dzisiejsza praktyka · 35/30 min · 30 min · 3 utwory</b>: trzy zadania po 10 minut z kółkami do odhaczenia. Pasek: seria 5 dni · 5 utworów · 3 opanowane. Niżej cytat z ostatniej lekcji.',
          why: 'Uczeń nie musi wiedzieć, co ćwiczyć — ma to policzone z zadań. Seria dni i „opanowane” to jedyna grywalizacja, i to taka, która mówi prawdę.',
          pitch: 'Rodzic pyta „ćwiczyłeś?” — tu jest odpowiedź w minutach.',
        },
        {
          title: 'Moje lekcje',
          shot: 's-lessons',
          see: '„Lekcje · 15 lekcji”, chipy Wszystkie / Zaplanowana / Zakończona / Odwołana. Karty pogrupowane datami: #15 15.10 15:00 „Przegląd repertuaru” <b>Zaplanowana</b>, #13 11.10 „Przegląd postępów w Wish You Were Here” <b>Zakończona</b>…',
          why: 'Ta sama lista co u nauczyciela, bez cudzych uczniów. Numer lekcji (#15) jest wspólny dla obu stron — łatwo o niej rozmawiać.',
        },
        {
          title: 'Moja lekcja',
          shot: 's-lesson-detail',
          see: 'Lekcja #15 · 15.10 · Zaplanowana · „Przegląd repertuaru” · 15:00. Nauczyciel: Anna Kowalska. Sekcja <b>Notatki</b>: „Przegląd repertuaru — próba trzyutworowego setu”.',
          why: 'Notatka nauczyciela jest widoczna przed lekcją (plan) i po lekcji (co było). To ona odpowiada na „co robiliśmy ostatnio”.',
          pitch: 'Uczeń przychodzi na lekcję wiedząc, co się wydarzy.',
        },
        {
          title: 'Moje zadania',
          shot: 's-assignments',
          see: '„Od Twojego nauczyciela · Zadania · 3 aktywnych”. Lista ze statusami: <b>Ukończone</b> „Zmiany akordów w Wonderwall”, <b>W trakcie</b> „Blackbird — wstęp palcami” (termin 10/16), <b>Nierozpoczęte</b> „Brown Eyed Girl — nagranie wideo” (10/20). Pod listą wysuwa się szczegół wybranego zadania.',
          why: 'Termin stoi przy tytule, pasek postępu pod nim. Zadanie z nagraniem wideo to normalna praca domowa, nie osobna funkcja.',
        },
        {
          title: 'Zadanie · od strony ucznia',
          shot: 's-assignment-detail',
          see: '„Blackbird — wstęp palcami”, termin 16 października, <b>Opis</b> z celem i sposobem zaliczenia (self-report), karta <b>Twoje ćwiczenia · Oddaj zadanie</b>: „Odhacz przećwiczone elementy, a następnie oznacz zadanie jako ukończone, aby przesłać je nauczycielowi.” Czarny przycisk „Oznacz jako ukończone”.',
          why: 'Jedna akcja na ekranie. Po niej nauczyciel dostaje powiadomienie i mail (test F05).',
          pitch: 'Oddanie zadania = jedno dotknięcie; nauczyciel wie o tym od razu.',
        },
        {
          title: 'Repertuar',
          shot: 's-repertoire',
          see: '„Repertuar · 5 utworów w Twoim repertuarze”. Filtry etapu z licznikami: Do nauki 1, Rozpoczęty 0, Zapamiętany 1, Gra z nagraniem 0, <b>Opanowany 3</b>; sortowanie „Ostatnio ćwiczone / Tytuł / Etap”. Wiersze: Wonderwall · Oasis · Opanowany · 13.10, Brown Eyed Girl…, każdy z rozwijanymi „Moje notatki”.',
          why: 'Etap ustawia nauczyciel na lekcji, notatki pisze uczeń. Repertuar rośnie sam — z utworów dopiętych do lekcji.',
          pitch: 'Po roku uczeń ma listę tego, co umie, z datami.',
        },
        {
          title: 'Ćwiczenia',
          shot: 's-practice',
          see: '„Ćwiczenia · 14 sesji · 455 min zarejestrowanych”. Formularz <b>Zarejestruj sesję</b>: utwór (opcjonalnie, domyślnie „Ogólna technika”), czas jako chipy 10 / 15 / 20 / 30 / 45 / 60 min albo inny, notatka „Co ćwiczyłeś?”. Niżej <b>Historia</b>: Wonderwall · 35 min · 92 BPM · 13.10 · „Refren — wreszcie czyste zmiany” z przyciskiem Usuń.',
          why: 'Wpis trwa pięć sekund. Jest niezmienny — da się tylko usunąć wpis z tego samego dnia (cofnięcie pomyłki). Brak wpisów przez kilka dni podnosi flagę u nauczyciela.',
          pitch: 'Dane o ćwiczeniu zamiast „trochę ćwiczyłem”.',
        },
        {
          title: 'Biblioteka · uczeń',
          shot: 's-songs',
          see: 'Ta sama biblioteka co u nauczyciela, ale zamiast „Nowy utwór” jest <b>„Poproś o utwór”</b>, a przy każdym wierszu <b>„Chcę się nauczyć”</b>.',
          why: 'Uczeń przegląda, prosi i zgłasza chęć; nie edytuje. Granica jest w bazie, nie w ukrytym przycisku.',
        },
      ],
    },
  ],
};
