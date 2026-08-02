import '@/app/design-tokens.css';

import type { Metadata } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Polityka prywatności — Strummy',
  description: 'Jakie dane zbiera Strummy, na jakiej podstawie prawnej i jak z nich skorzystać.',
};

const CONTACT = 'p.romanczuk@gmail.com';

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'Administrator danych',
    body: [
      `Administratorem danych osobowych jest Piotr Romanczuk, kontakt: ${CONTACT}. Strummy działa obecnie jako projekt w fazie publicznej bety, prowadzony przez jedną osobę.`,
    ],
  },
  {
    heading: 'Jakie dane przetwarzamy',
    body: [
      'Dane konta: imię, nazwisko, adres e-mail, avatar, numer telefonu (opcjonalnie), rola (nauczyciel, uczeń, rodzic, admin).',
      'Dane lekcji: notatki, przypisane utwory, postępy, obecność, harmonogram — a jeśli połączysz Kalendarz Google, także zsynchronizowane terminy lekcji.',
      'Dane operacyjne: zdarzenia logowania i historia zmian w lekcjach, zadaniach i profilach, przechowywane w celu diagnozowania problemów.',
      'Treści przesyłane do funkcji AI (OpenRouter w chmurze lub Ollama lokalnie) wraz z odpowiedzią, aby można było później zweryfikować wynik. Nie wklejaj tam niczego, czego nie chcesz przechowywać.',
      'Jeśli połączysz konto Spotify — tytuły utworów i cechy audio, wyłącznie do wzbogacania biblioteki repertuaru.',
    ],
  },
  {
    heading: 'Podstawa prawna przetwarzania',
    body: [
      'Świadczenie usługi (konto, lekcje, postępy) — art. 6 ust. 1 lit. b RODO: przetwarzanie niezbędne do wykonania usługi, na którą się zapisujesz.',
      'Diagnostyka błędów i bezpieczeństwo — art. 6 ust. 1 lit. f RODO: prawnie uzasadniony interes administratora w utrzymaniu działającej i bezpiecznej aplikacji.',
      'Integracje opcjonalne (Spotify, Kalendarz Google) i analityka użycia — art. 6 ust. 1 lit. a RODO: zgoda, włączana świadomie przez Ciebie w ustawieniach.',
    ],
  },
  {
    heading: 'Okres przechowywania',
    body: [
      'Dane przechowujemy przez czas posiadania aktywnego konta. Po zgłoszeniu usunięcia konta w Ustawieniach dane są usuwane w ciągu 30 dni — w tym czasie usunięcie można cofnąć.',
    ],
  },
  {
    heading: 'Odbiorcy danych',
    body: [
      'Dane mogą być przetwarzane przez dostawców infrastruktury niezbędnych do działania usługi: bazę danych i hosting aplikacji, Sentry (monitoring błędów), PostHog (analityka), a jeśli korzystasz z danych funkcji — OpenRouter (dane mogą trafiać poza EOG), Google (Kalendarz) i Spotify. Dane nie są sprzedawane ani udostępniane nikomu poza wymienionymi dostawcami.',
    ],
  },
  {
    heading: 'Twoje prawa',
    body: [
      'Masz prawo do: dostępu do danych, ich sprostowania, usunięcia ("prawo do bycia zapomnianym"), ograniczenia przetwarzania, przenoszenia danych oraz sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie.',
      `Aby skorzystać z tych praw, napisz na ${CONTACT}. Konto i powiązane dane możesz też usunąć samodzielnie w Ustawieniach.`,
      'Masz również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO), jeśli uznasz, że przetwarzanie narusza RODO.',
    ],
  },
  {
    heading: 'Dane dzieci',
    body: [
      'Jeśli jesteś uczniem poniżej 16. roku życia, założenie konta i przetwarzanie Twoich danych wymaga zgody rodzica lub opiekuna prawnego. Konta uczniów zakłada nauczyciel, na zaproszenie — to on odpowiada za uzyskanie tej zgody przed wprowadzeniem danych ucznia.',
      `Rodzic może w każdej chwili poprosić o dane dziecka lub ich usunięcie, pisząc na ${CONTACT}.`,
    ],
  },
  {
    heading: 'Zmiany polityki',
    body: [
      'O istotnych zmianach niniejszej polityki poinformujemy e-mailem lub komunikatem w aplikacji.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div
      className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}
      style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '56px 24px 96px' }}>
        <Link href="/" style={{ color: 'var(--ink-3)', fontSize: 13, textDecoration: 'none' }}>
          ← Strummy
        </Link>

        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 38,
            letterSpacing: '-0.02em',
            margin: '22px 0 8px',
          }}
        >
          Polityka prywatności
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6, marginBottom: 40 }}>
          Ostatnia aktualizacja: 2 sierpnia 2026. Zobacz też{' '}
          <Link href="/beta" style={{ color: 'var(--ink-2)' }}>
            informację o becie
          </Link>{' '}
          — opisuje w prostych słowach, czym jest Strummy w tej fazie.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.heading} style={{ marginBottom: 34 }}>
            <h2
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 12,
              }}
            >
              {section.heading}
            </h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph}
                style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', marginBottom: 12 }}
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.6 }}>
          Pytania kieruj na{' '}
          <a href={`mailto:${CONTACT}`} style={{ color: 'var(--ink-2)' }}>
            {CONTACT}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
