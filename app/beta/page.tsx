import '@/app/design-tokens.css';

import type { Metadata } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

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

const CONTACT = 'p.romanczuk@gmail.com';

/** Section ids in `BetaNotice.*` and how many paragraphs each one has. */
const SECTIONS = [
  { id: 'meaning', paragraphs: 3 },
  { id: 'stored', paragraphs: 4 },
  { id: 'where', paragraphs: 2 },
  { id: 'minors', paragraphs: 2 },
  { id: 'delete', paragraphs: 2 },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('BetaNotice');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function BetaNoticePage() {
  const t = await getTranslations('BetaNotice');

  return (
    <div
      className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable} min-h-screen bg-[var(--paper)] text-[var(--ink)]`}
    >
      <div className="mx-auto max-w-[680px] px-6 pb-24 pt-14">
        <Link href="/" className="text-[13px] text-[var(--ink-3)] no-underline">
          {t('back')}
        </Link>

        <h1 className="mb-2 mt-[22px] font-[family-name:var(--serif)] text-[38px] font-normal tracking-[-0.02em]">
          {t('title')}
        </h1>
        <p className="mb-10 text-sm leading-relaxed text-[var(--ink-3)]">{t('intro')}</p>

        {SECTIONS.map(({ id, paragraphs }) => (
          <section key={id} className="mb-[34px]">
            <h2 className="mb-3 font-[family-name:var(--mono)] text-[11px] uppercase tracking-[.16em] text-[var(--ink-4)]">
              {t(`${id}.heading`)}
            </h2>
            {Array.from({ length: paragraphs }, (_, index) => (
              <p key={index} className="mb-3 text-sm leading-[1.7] text-[var(--ink-2)]">
                {t(`${id}.p${index + 1}`, { contact: CONTACT })}
              </p>
            ))}
          </section>
        ))}

        <p className="text-[13px] leading-relaxed text-[var(--ink-4)]">
          {t.rich('questions', {
            contact: CONTACT,
            mail: (chunks) => (
              <a href={`mailto:${CONTACT}`} className="text-[var(--ink-2)]">
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
