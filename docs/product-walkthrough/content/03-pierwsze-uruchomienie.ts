import type { Chapter } from './walkthrough.types';

export const chapter03: Chapter = {
  title: 'Wejście — strona, logowanie, pierwsze kroki',
  lead: 'Nauczyciel trafia na stronę, ogląda demo bez rejestracji, zostawia kontakt. Konto zakłada mu dziś właściciel; po zalogowaniu kreator prowadzi przez pięć kroków: kim jesteś, Twoje studio, pierwsza lekcja. Uczeń nie rejestruje się sam — dostaje zaproszenie od nauczyciela.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Strona główna',
          shot: 'p-landing',
          see: 'Przełącznik <b>Dla nauczycieli | Dla ucznia</b>, plakietka „Publiczna beta · za darmo dla nauczycieli — bez karty”. Nagłówek: „Nigdy więcej nie zastanawiaj się, «co robiliśmy ostatnim razem?»”. Dwa wyjścia: „Otwórz demo pracowni” i „Przydałoby się? Napisz do mnie”.',
          why: 'Jedno zdanie problemu, jedno zdanie rozwiązania, demo bez formularza. Strona jest w całości po polsku i po angielsku.',
          pitch: 'Demo pracowni otwiera się bez konta — można pokazać na cudzym telefonie.',
        },
        {
          title: 'Dla nauczycieli',
          shot: 'p-for-teachers',
          see: '„Zrobione przez nauczyciela gitary, dla nauczycieli gitary.” Karta „Otwórz demo pracowni” (czwórka uczniów, semestr notatek, aktywne zadania — nic nie dotyka prawdziwych danych) i formularz „Przydałoby się to w Twojej pracowni?” z dwoma polami obowiązkowymi.',
          why: 'Formularz zbiera kontakt i kontekst (ilu uczniów, jak dziś prowadzą notatki). Odpowiedź przychodzi od człowieka, nie z autorespondera.',
          pitch: 'Argument wiarygodności: autor sam uczy i sam tego używa.',
        },
        {
          title: 'Logowanie',
          shot: 'p-signin',
          see: 'Karta „Sign in.” z e-mailem i hasłem, „Forgot password?”, przycisk „Try the demo studio” i link „Start your studio” dla nowych.',
          why: 'Logowanie e-mailem i hasłem z zaproszenia. Google jest możliwe, ale nie wymagane.',
          note: 'Ekran logowania jest po angielsku (nagłówek, podpowiedzi, przyciski) — to pierwsza rzecz, którą widzi zaproszony uczeń.',
        },
        {
          title: 'Logowanie · błędne hasło',
          shot: 'p-signin-error',
          see: "Czerwona ramka: „Invalid email or password. If you haven't set a password yet, please use «Forgot password?» to create one.” Formularz zostaje wypełniony.",
          why: 'Najczęstszy przypadek to zaproszony uczeń bez hasła — komunikat od razu mówi, co zrobić, zamiast „błąd logowania”.',
          pitch: 'Komunikat prowadzi do rozwiązania, nie kończy rozmowy.',
        },
        {
          title: 'Reset hasła',
          shot: 'p-forgot',
          see: '„Forgot your password?” — jedno pole e-mail i przycisk „Send reset link”, link powrotu do logowania.',
          why: 'Jedno pole, bez pytań pomocniczych. Link przychodzi mailem i ważny jest przez ograniczony czas.',
        },
        {
          title: 'Gryf · publicznie',
          shot: 'p-fretboard-public',
          see: 'Plakietka „Za darmo · bez rejestracji”: eksplorator gryfu — pentatonika molowa A, dźwięki na sześciu strunach, przyciski dźwięków i tonacji, „Ustawienia”.',
          why: 'Narzędzie z aplikacji wystawione bez logowania: nauczyciel może wysłać uczniowi link „zobacz, o co chodzi” zanim ten ma konto.',
          pitch: 'Darmowy wabik, który pokazuje jakość reszty.',
        },
      ],
    },
    {
      kind: 'text',
      html: '<p><b>Kreator po pierwszym logowaniu</b> (pięć kroków dla nauczyciela: rola → o Tobie → Twoje studio z podglądem na żywo → pierwsza lekcja → gotowe; trzy dla ucznia: rola → „Twoja droga z gitarą” → gotowe) nie ma zrzutu w tym wydaniu: konta demo mają go już za sobą, a nie zakładaliśmy świeżego konta na potrzeby dokumentu. Przepływ jest objęty testem F01.5.</p>',
    },
  ],
};
