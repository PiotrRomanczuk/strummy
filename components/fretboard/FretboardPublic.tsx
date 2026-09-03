'use client';

import { useTranslations } from 'next-intl';

import { Fretboard } from './Fretboard';
import { FretboardPublicCta } from './FretboardPublic.Cta';
import { FretboardPublicHeader } from './FretboardPublic.Header';

/**
 * The free, signed-out home of the fretboard explorer.
 *
 * Same board as `/dashboard/fretboard` — not a cut-down copy — wrapped in the
 * chrome a visitor with no account needs: who made this, what it is, and one
 * way in afterwards. Nothing here is gated: a tool that argues for the product
 * has to be the whole tool.
 */
export const FretboardPublic = ({ isSignedIn = false }: { isSignedIn?: boolean }) => {
  const t = useTranslations('FretboardPublic');

  return (
    <div className="ui-fbp" data-testid="fbp-page">
      <FretboardPublicHeader isSignedIn={isSignedIn} />

      <section className="ui-fbp-hero">
        <span className="ui-fbp-badge" data-testid="fbp-badge">
          {t('badge')}
        </span>
        <h1
          data-testid="fbp-heading"
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 38,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            margin: '10px 0 8px',
          }}
        >
          {t('heading')}
        </h1>
        <p
          data-testid="fbp-lede"
          style={{
            margin: 0,
            maxWidth: 640,
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--ink-3)',
          }}
        >
          {t('lede')}
        </p>
      </section>

      <Fretboard variant="public" />

      <FretboardPublicCta isSignedIn={isSignedIn} />

      <footer className="ui-fbp-footer" data-testid="fbp-footer">
        {t('footer')}
      </footer>
    </div>
  );
};
