import '@/app/design-tokens.css';

import type { Metadata } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { getTranslations } from 'next-intl/server';

import { ForSchools } from '@/components/for-schools';
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ForSchools.meta');
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: siteUrl('/for-schools') },
  };
}

/**
 * The public page for music schools. Unlike `/`, it never redirects a signed-in
 * visitor to the dashboard: a teacher who already has an account is exactly who
 * forwards this link to the school that employs them.
 */
export default function ForSchoolsPage() {
  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <ForSchools />
    </div>
  );
}
