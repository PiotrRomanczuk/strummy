import '@/app/design-tokens.css';

import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { getTranslations } from 'next-intl/server';

import { TeacherLeadForm } from '@/components/for-teachers';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ForTeachers.meta');
  return { title: t('title'), description: t('description') };
}

export default async function ForTeachersPage() {
  const t = await getTranslations('ForTeachers');

  return (
    <div
      className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}
      style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '56px 24px 96px' }}>
        <Link href="/" style={{ color: 'var(--ink-3)', fontSize: 13, textDecoration: 'none' }}>
          ← Strummy
        </Link>

        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
            margin: '22px 0 10px',
          }}
        >
          {t('hero.eyebrow')}
        </p>

        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 38,
            letterSpacing: '-0.02em',
            margin: '0 0 14px',
          }}
        >
          {t('hero.headline')}
        </h1>

        <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
          {t('hero.lede')}
        </p>

        <div
          style={{
            border: '1px solid var(--rule)',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 40,
          }}
        >
          <Link
            href="/sign-in?demo=true"
            data-testid="for-teachers-demo-link"
            style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}
          >
            {t('hero.demoCta')} →
          </Link>
          <p style={{ color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6, margin: '8px 0 0' }}>
            {t('hero.demoNote')}
          </p>
        </div>

        {/* useSearchParams() reads the campaign source, so the form needs a
            boundary or the whole route opts out of static rendering. */}
        <Suspense fallback={null}>
          <TeacherLeadForm />
        </Suspense>
      </div>
    </div>
  );
}
