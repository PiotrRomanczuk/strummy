import type { Chapter } from './walkthrough.types';

export const chapter09: Chapter = {
  title: 'Umiejętności i narzędzia',
  lead: 'Trzy narzędzia do samodzielnej pracy, które przeszły z „ciekawostki” do menu dopiero, gdy dało się je zadać i zobaczyć wynik: quiz akordów z powtórkami, gryf z presetami, lista umiejętności prowadzona przez nauczyciela. Teoria jest zbudowana, ale schowana — ma jeden kurs.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Umiejętności · start',
          shot: 't-skills',
          see: 'Kafle XP 0 (250 do poziomu 2), Dziś 0/40, Skuteczność z ostatnich 7 dni. Karta „Cel dnia · 40 XP, by utrzymać serię”. Sekcja <b>Wybierz tryb</b>: „Nazwij akord · zobacz diagram, wybierz nazwę · 5 min · Start”. Niżej „Ćwiczysz: zagraj rundę, a najczęściej mylone akordy pojawią się tutaj.”',
          why: 'Jeden tryb na start, cel dnia zamiast rankingu. Mylone akordy wracają częściej (SRS) — bez tłumaczenia, co to SRS.',
          note: 'Powitanie „Good morning, Anna” jest po angielsku i nie zmienia się z porą dnia.',
        },
        {
          title: 'Quiz akordów',
          shot: 's-chord-quiz',
          see: '„Pytanie 1 z 10 · Nazwij akord · Jaki to akord?” Diagram z palcowaniem, cztery odpowiedzi (Am7 / B / A / Em7), pasek postępu, 5 serc, licznik serii.',
          why: 'Odpowiedź to jedno dotknięcie; po dziesięciu pytaniach wynik i lista do powtórki. Nauczyciel może zadać rundę jako zadanie.',
          pitch: 'Nauka akordów między lekcjami, którą nauczyciel widzi w wynikach.',
        },
        {
          title: 'Gryf',
          shot: 't-fretboard',
          see: '„A Pentatonika molowa”, 15 progów, dźwięki podpisane na strunach, prymy złote. Przyciski dźwięków (A C D E G) i tonacji (C–B z krzyżykami), „Ustawienia”. Podpowiedź: „Obróć telefon — albo przewiń gryf w bok — żeby zobaczyć wszystkie 15 progów.”',
          why: 'Zestaw skala + tonacja + widok zapisuje się jako preset i da się wysłać uczniowi linkiem (test F09). Działa też bez logowania (rozdział 3).',
          pitch: 'Tłumaczenie skali na lekcji bez rysowania na kartce.',
        },
        {
          title: 'Moje umiejętności · pusto',
          shot: 's-my-skills',
          see: '„Twoje postępy · Umiejętności i postępy · Umiejętności, które śledzi z Tobą nauczyciel.” Pusty stan: „Nauczyciel nie zapisał jeszcze żadnych umiejętności. Pojawią się tutaj po najbliższej lekcji.”',
          why: 'Lista umiejętności (lista kontrolna wg poziomu + mapa drogowa) jest prowadzona przez nauczyciela z profilu ucznia; uczeń widzi odhaczenia. Pusto mówi, kto i kiedy to wypełni.',
        },
        {
          title: 'Teoria (ukryta w menu)',
          shot: 't-theory',
          see: '„Teoria · 1 kurs”: „Podstawy gitary — z notatnika” (Początkujący, 8 rozdziałów: akordy, tonacje, gryf, strumowanie, capo, fingerpicking, czytanie…), przycisk „+” do dodania kursu.',
          why: 'Mechanika kursów (rozdziały, lekcje, dostęp per uczeń) jest gotowa; brakuje treści. Dlatego nie ma jej w menu — zasada 8 z rozdziału 13.',
          note: 'Dostępna tylko z adresu /dashboard/theory. Do pokazania na demo dopiero po dopisaniu drugiego kursu.',
        },
      ],
    },
  ],
};
