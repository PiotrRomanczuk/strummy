import type { Chapter } from './walkthrough.types';

export const chapter14: Chapter = {
  title: 'Pytania nauczycieli i odpowiedzi',
  lead: 'Odpowiedzi są takie, jakie da się dziś obronić ekranem. Tam, gdzie czegoś nie ma, jest to napisane wprost.',
  blocks: [
    {
      kind: 'table',
      head: ['Pytanie', 'Odpowiedź'],
      widths: ['30%', '70%'],
      rows: [
        [
          'Ile to kosztuje?',
          'Strummy jest w publicznej becie i jest darmowe. Nie ma limitu uczniów ani utworów. Model płatny nie jest jeszcze ustalony; nikt nie zostanie zaskoczony rachunkiem.',
        ],
        [
          'Co muszę zainstalować?',
          'Nic. Aplikacja działa w przeglądarce telefonu, tabletu i komputera; da się ją przypiąć do ekranu jak zwykłą aplikację (PWA).',
        ],
        [
          'Ile czasu zajmie start?',
          'Logowanie, pięć kroków kreatora (o Tobie, Twoje studio, pierwsza lekcja) i pierwszy uczeń dodany przez e-mail. Kwadrans razem z zaproszeniem ucznia.',
        ],
        [
          'Czy uczeń widzi innych uczniów?',
          'Nie. Pilnuje tego baza danych, nie interfejs: uczeń dostaje tylko własne wiersze, a próba wejścia pod adres cudzej lekcji kończy się „nie znaleziono”. Jest na to automatyczny test.',
        ],
        [
          'Czy muszę wpisać wszystkie utwory?',
          'Nie. Biblioteka ma import z Ultimate Guitar (adres tabulatury → utwór z akordami), a utwór dodaje się raz i dopina do lekcji wielu uczniów.',
        ],
        [
          'Czy to działa po polsku?',
          'Strona publiczna i większość ekranów — tak, przełącznik języka jest w menu. Część napisów w panelu nauczyciela jest jeszcze po angielsku; to widać na zrzutach w tym dokumencie i jest w planie.',
        ],
        [
          'A kalendarz Google?',
          'Synchronizacja lekcji z Google Calendar jest zbudowana i była włączona, ale dziś jest uśpiona (nikt z niej nie korzystał). Włączenie to decyzja, nie projekt.',
        ],
        [
          'Co, jeśli uczeń nie ma e-maila?',
          'Nauczyciel może dodać ucznia bez konta („cień”), prowadzić mu lekcje i repertuar, a zaproszenie wysłać później — historia przechodzi na konto po jego założeniu.',
        ],
        [
          'Czy rodzic coś zobaczy?',
          'Jest widok rodzica: tylko do odczytu, jedno dziecko, lekcje i postępy. Działa, ale nie jest jeszcze w menu — włączany na życzenie.',
        ],
        [
          'A jak się pomylę?',
          'Lekcję da się edytować i odwołać, zadanie zmienić, wpis ćwiczenia z tego samego dnia usunąć. Statusy są jawne (zaplanowana, w trakcie, zakończona, odwołana), nic nie znika po cichu.',
        ],
        [
          'Czy dane są moje?',
          'Tak. Jedna baza, kopie zapasowe co noc, eksport na życzenie. Strona „Prywatność” i „Beta” opisują, co i jak jest przechowywane.',
        ],
        [
          'Kiedy wersja „bez bety”?',
          'Gdy podstawowa pętla (rozdziały 2–10) przejdzie kilka miesięcy z prawdziwymi uczniami bez poprawek. Lista flow F01–F11, która to definiuje, jest zielona od 2026-10-12.',
        ],
      ],
    },
  ],
};
