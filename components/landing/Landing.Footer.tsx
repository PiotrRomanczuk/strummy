import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { Wordmark } from './Landing.primitives';

const SocialIconLink = ({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) => (
  <a
    href={href}
    {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    aria-label={label}
    style={{
      width: 32,
      height: 32,
      border: '1px solid var(--rule)',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--ink-3)',
    }}
  >
    {children}
  </a>
);

export const LandingFooter = async () => {
  const t = await getTranslations('Landing.footer');

  const columns: { title: string; items: { label: string; href: string }[] }[] = [
    {
      title: t('productTitle'),
      items: [
        { label: t('features'), href: '#features' },
        { label: t('howItWorks'), href: '#how-it-works' },
        { label: t('changelog'), href: 'https://github.com/PiotrRomanczuk/strummy/releases' },
      ],
    },
    {
      title: t('studioTitle'),
      items: [
        { label: t('forTeachers'), href: '#for-teachers' },
        { label: t('signIn'), href: '/sign-in' },
        { label: t('createAccount'), href: '/sign-up' },
      ],
    },
    {
      title: t('legalTitle'),
      items: [
        { label: t('betaNotice'), href: '/beta' },
        { label: t('privacyPolicy'), href: '/privacy' },
      ],
    },
  ];

  return (
    <div style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper)' }}>
      <div className="ui-land-footer-grid">
        <div>
          <div style={{ marginBottom: 10 }}>
            <Wordmark fontSize={26} />
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13, maxWidth: 300, lineHeight: 1.55 }}>
            {t('tagline')}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <SocialIconLink href="https://github.com/PiotrRomanczuk" label="GitHub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
              </svg>
            </SocialIconLink>
            <SocialIconLink href="https://www.linkedin.com/in/piotr-romanczuk" label="LinkedIn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
              </svg>
            </SocialIconLink>
            <SocialIconLink href="https://wa.me/48513602768" label="WhatsApp">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.85.5 3.58 1.36 5.03L2 22l5.25-1.38c1.45.79 3.08 1.24 4.79 1.24h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2Zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24Zm4.52 5.85c-.06-.13-.22-.21-.46-.32-.24-.11-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.11-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.58 4.09 3.62.57.25 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14Z" />
              </svg>
            </SocialIconLink>
            <SocialIconLink href="mailto:p.romanczuk@gmail.com" label="Email">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13Zm2.2.5 7.8 5.4L19.8 6H4.2ZM20 8.2l-7.4 5.13a1 1 0 0 1-1.14 0L4 8.2V18.5c0 .28.22.5.5.5h15a.5.5 0 0 0 .5-.5V8.2Z" />
              </svg>
            </SocialIconLink>
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 12,
              }}
            >
              {col.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.items.map((it) => (
                <a
                  key={it.label}
                  href={it.href}
                  className="ui-land-link"
                  {...(it.href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {it.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="ui-land-footer-base">
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {t('copyright')}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          strummy.online
        </div>
      </div>
    </div>
  );
};
