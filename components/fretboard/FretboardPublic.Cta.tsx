import Link from 'next/link';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { sectionLabel } from './fretboard.styles';

/**
 * The one conversion band on the page, under the board rather than over it.
 * A visitor who scrolled past a working tool has already been sold something;
 * this only says who built it and where to go next.
 */
export const FretboardPublicCta = ({ isSignedIn }: { isSignedIn: boolean }) => {
  const t = useTranslations('FretboardPublic');

  return (
    <section className="ui-fbp-cta-band" data-testid="fbp-cta">
      <div style={{ maxWidth: 620 }}>
        <div style={sectionLabel}>{t('cta.eyebrow')}</div>
        <h2
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: '6px 0 8px',
          }}
        >
          {t('cta.heading')}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          {t('cta.body')}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {isSignedIn ? (
          <Link href="/dashboard" data-testid="fbp-cta-studio" className="ui-fbp-cta">
            {t('nav.studio')}
            <ArrowRight size={14} aria-hidden />
          </Link>
        ) : (
          <Link href="/sign-in?demo=true" data-testid="fbp-cta-demo" className="ui-fbp-cta">
            {t('cta.primary')}
            <ArrowRight size={14} aria-hidden />
          </Link>
        )}
        <Link href="/for-teachers" data-testid="fbp-cta-secondary" className="ui-fbp-link">
          {t('cta.secondary')}
        </Link>
      </div>
    </section>
  );
};
