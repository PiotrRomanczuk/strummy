import Link from 'next/link';

import { useTranslations } from 'next-intl';

/**
 * The bar a signed-out visitor sees instead of the app chrome: who made this,
 * and one way in. Deliberately quiet — the tool is the pitch.
 */
export const FretboardPublicHeader = ({ isSignedIn }: { isSignedIn: boolean }) => {
  const t = useTranslations('FretboardPublic');

  return (
    <header className="ui-fbp-header" data-testid="fbp-header">
      <Link href="/" data-testid="fbp-home" className="ui-fbp-brand">
        {t('nav.home')}
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isSignedIn ? (
          <Link href="/dashboard" data-testid="fbp-studio" className="ui-fbp-cta">
            {t('nav.studio')}
          </Link>
        ) : (
          <>
            <Link href="/sign-in" data-testid="fbp-signin" className="ui-fbp-link">
              {t('nav.signIn')}
            </Link>
            <Link href="/sign-in?demo=true" data-testid="fbp-demo" className="ui-fbp-cta">
              {t('nav.demo')}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};
