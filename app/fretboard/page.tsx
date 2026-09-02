import '@/app/design-tokens.css';

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { FretboardPublic } from '@/components/fretboard/FretboardPublic';
import { isAppLocale, type AppLocale } from '@/i18n/locales';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { siteUrl } from '@/lib/site';

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

const CANONICAL = siteUrl('/fretboard');

type SearchParams = Promise<{ lang?: string }>;

/**
 * `?lang=pl` has to work on the FIRST paint here.
 *
 * The proxy resolves the parameter and writes NEXT_LOCALE, but a cookie set on
 * the response is not readable by the render that produced it — so a campaign
 * link would show English once and Polish only after the next navigation. This
 * page is what a Polish teacher pastes into a Polish group; the first
 * impression is the only one it gets, so the parameter is honoured here too.
 */
async function requestedLocale(searchParams: SearchParams): Promise<AppLocale | null> {
  const { lang } = await searchParams;
  return isAppLocale(lang) ? lang : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const explicit = await requestedLocale(searchParams);
  const locale = explicit ?? (await getLocale());
  const t = await getTranslations({ locale, namespace: 'FretboardPublic.meta' });

  return {
    title: t('title'),
    description: t('description'),
    // One canonical for both languages: the locale is chosen per visitor
    // (cookie / Accept-Language / ?lang=), not by a separate URL, so there is
    // no second address for a crawler to treat as duplicate content.
    alternates: { canonical: CANONICAL },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: CANONICAL,
      siteName: 'Strummy',
      locale,
      title: t('title'),
      description: t('description'),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}

/**
 * The free fretboard explorer — the one page of the product that needs no
 * account. Auth is consulted only to decide where the buttons point: the proxy
 * gates `/dashboard/*` alone, so this route is public by construction, and
 * nothing on it reads the database.
 */
export default async function PublicFretboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ user }, explicit] = await Promise.all([
    getUserWithRolesSSR(),
    requestedLocale(searchParams),
  ]);
  const locale = explicit ?? (await getLocale());
  const t = await getTranslations({ locale, namespace: 'FretboardPublic' });

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: t('appName'),
    description: t('meta.description'),
    url: CANONICAL,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any modern browser',
    inLanguage: locale,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'PLN' },
  };

  const page = <FretboardPublic isSignedIn={!!user} />;

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <script
        type="application/ld+json"
        // Serialised from the literal above — no user input reaches this string.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Suspense fallback={null}>
        {explicit ? (
          <NextIntlClientProvider
            locale={explicit}
            messages={(await import(`@/messages/${explicit}.json`)).default}
          >
            {page}
          </NextIntlClientProvider>
        ) : (
          page
        )}
      </Suspense>
    </div>
  );
}
