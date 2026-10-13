import type { Chapter } from './walkthrough.types';

export const chapter15: Chapter = {
  title: 'Słownik',
  lead: 'Słowa, które w aplikacji znaczą coś konkretnego. Warto ich używać tak samo w rozmowie, w interfejsie i w kodzie.',
  blocks: [
    {
      kind: 'table',
      head: ['Słowo', 'Znaczenie w aplikacji'],
      widths: ['22%', '78%'],
      rows: [
        [
          'Lekcja',
          'Spotkanie nauczyciela z uczniem w dniu i godzinie. Ma status: zaplanowana, w trakcie, zakończona, odwołana; po terminie bez zamknięcia — zaległa. Może powtarzać się co tydzień.',
        ],
        [
          'Utwór',
          'Pozycja w bibliotece nauczyciela: tytuł, wykonawca, poziom, akordy nad tekstem, diagramy, linki (UG, YouTube, Spotify). Istnieje raz, niezależnie od uczniów.',
        ],
        [
          'Repertuar',
          'Utwory danego ucznia z etapem pracy i samooceną. Powstaje automatycznie, gdy utwór trafia do lekcji; uczeń może też zgłosić „chcę się nauczyć”.',
        ],
        [
          'Etap',
          'Gdzie uczeń jest z utworem: od „zaczęty” do „opanowany”. Ustawia nauczyciel przy lekcji; widać go w repertuarze i w profilu ucznia.',
        ],
        [
          'Zadanie',
          'Praca domowa z terminem, przypięta do ucznia (opcjonalnie do utworu). Uczeń zmienia status; po terminie — zaległe, z przypomnieniem mailem. Szablony skracają tworzenie.',
        ],
        [
          'Sesja ćwiczeń',
          'Wpis ucznia „ćwiczyłem X minut nad Y”. Niezmienny; wpis z tego samego dnia da się usunąć (cofnięcie). Brak wpisów przez N dni podnosi flagę „wymaga uwagi” u nauczyciela.',
        ],
        [
          'Umiejętności',
          'Lista kontrolna i mapa drogowa technik gitarowych wg poziomu; quiz akordów z powtórkami w odstępach (SRS) jest ich częścią.',
        ],
        [
          'Gryf',
          'Interaktywny podgląd gryfu: skale, akordy, strojenia; zestaw ustawień da się zapisać jako preset.',
        ],
        [
          'Zaproszenie',
          'Mail do nowego ucznia z linkiem do założenia hasła. Konto bez e-maila to „cień”: profil prowadzony przez nauczyciela, łączony z kontem po zaproszeniu.',
        ],
        [
          'Rola',
          'Administrator, nauczyciel, uczeń — nadawane w profilu; rodzic to flaga z linkiem do dziecka. Dostęp do danych wynika z roli i jest egzekwowany w bazie.',
        ],
        [
          'Powiadomienie',
          'Zdarzenie z pętli (lekcja za 24 h, nowe zadanie, zadanie zaległe, utwór opanowany…) dostarczane w aplikacji i mailem; każdy typ ma własny przełącznik w ustawieniach.',
        ],
        [
          'Dom',
          'Pierwszy ekran po zalogowaniu; inny dla nauczyciela (dzień, uwaga, tydzień) i ucznia (następna lekcja, zadania, repertuar).',
        ],
      ],
    },
  ],
};
