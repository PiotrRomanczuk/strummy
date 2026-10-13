import type { Chapter } from './walkthrough.types';

export const chapter12: Chapter = {
  title: 'Komputer i tablet',
  lead: 'Ta sama aplikacja na ekranie 1440 × 900: stały pasek boczny z tymi samymi dziewięcioma pozycjami, wyszukiwarka u góry, lista i szczegół obok siebie. Tablet poziomo zachowuje się jak komputer, pionowo jak duży telefon z paskiem bocznym.',
  blocks: [
    {
      kind: 'wide',
      items: [
        {
          title: 'Dom nauczyciela na komputerze',
          shot: 'd-home',
          see: '„Good morning, Anna.” — oś dnia z godzinami 9–20 i jedną lekcją (Zofia Nowak 11:00, przycisk „Prep”), przełącznik Today / Week / Month, po prawej gęstość tygodnia i porównanie z zeszłym tygodniem. Na górze: „Tydzień 42”, dzwonek, „Nowa lekcja”.',
          why: 'Oś dnia pokazuje luki między lekcjami — na telefonie jest listą, tu jest kalendarzem.',
          pitch: 'Jeden rzut oka na dzień z drugiego końca sali.',
        },
        {
          title: 'Lekcje · lista i szczegół',
          shot: 'd-lessons-selected',
          see: 'Tabela lekcji (data, lekcja, uczeń, utwory, godzina, status) z filtrami statusów jako chipami z licznikami (Zaplanowana 6 · W trakcie 0 · Zakończona 34 · Odwołana 0). Kliknięty wiersz otwiera panel po prawej: „Hotel California w całości”, status, data, uczeń.',
          why: 'Lista nie znika, gdy się czyta szczegół. Na telefonie ten sam wiersz otwiera osobny ekran.',
        },
        {
          title: 'Utwór na komputerze',
          shot: 'd-song-detail',
          see: 'Wonderwall: okładka, metryka, odtwarzacz z falą dźwięku, zakładki, karta akordów (Em7 · G · Dsus4 · A7sus4 z diagramami) i „Sekcje i przebieg”. Po prawej „Wykorzystanie” (7 uczniów, 12 lekcji, w bibliotece od lipca 2026) i „Szybkie przypisanie” do ucznia z terminem.',
          why: 'Przypisanie utworu jako zadania bez opuszczania strony — na komputerze mieści się obok, na telefonie jest pod przyciskiem „Zadaj uczniowi”.',
        },
        {
          title: 'Profil ucznia na komputerze',
          shot: 'd-user-detail',
          see: 'Zofia Nowak, cztery kafle (seria, frekwencja, repertuar, lekcje), zakładki, wykres minut ćwiczeń z „+105 % vs poprzedni”, lista ostatnich sesji, po prawej następna lekcja (czw. 15.10 · 11:00) i „Notatki nauczyciela” z ostatnich lekcji.',
          why: 'Ekran do rozmowy z rodzicem: wszystko na jednej stronie, bez przewijania.',
          pitch: 'Historia ucznia w jednej ramce — do pokazania na spotkaniu.',
        },
        {
          title: 'Dom ucznia na komputerze',
          shot: 'd-s-home',
          see: '„za 0h 43m” z osią czasu, dzisiejsza praktyka (3 utwory), ostatnia lekcja z cytatem, seria 5 dni, repertuar „5 utworów · 3 opanowane” i aktywność.',
          why: 'Uczeń częściej jest na telefonie; komputer to ten sam zestaw bloków w dwóch kolumnach.',
        },
      ],
    },
    {
      kind: 'screens',
      items: [
        {
          title: 'Tablet pionowo (834 × 1112)',
          shot: 'tab-home-portrait',
          see: 'Pasek boczny zostaje, treść układa się w jednej kolumnie: oś dnia na całą szerokość, gęstość tygodnia pod nią.',
          why: 'Tablet na statywie w sali: pasek boczny jest zawsze pod ręką, oś dnia czytelna z metra.',
        },
        {
          title: 'Tablet poziomo (1112 × 834)',
          shot: 'tab-lessons-landscape',
          see: 'Lista lekcji w układzie komputerowym: filtry statusów, tabela, pasek boczny.',
          why: 'Powyżej 1024 px i proporcji 1,2 układ przełącza się na „szeroki” — tablet poziomo dostaje to, co komputer.',
        },
      ],
    },
  ],
};
