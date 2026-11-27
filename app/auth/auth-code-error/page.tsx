import '@/app/design-tokens.css';

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { AuthHeader, AuthLayout } from '@/components/auth';
import { dashboardFontVariables } from '@/lib/config/dashboard-fonts';

/**
 * Landing spot of `/auth/callback` when the code exchange fails (expired or
 * reused link). Lives outside the `(auth)` route group, so it applies the same
 * design tokens and fonts that group's layout provides.
 */
export default async function AuthCodeError() {
  const t = await getTranslations('AuthCodeError');

  return (
    <div className={`theme-strummy ${dashboardFontVariables}`}>
      <AuthLayout>
        <AuthHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
        <Link href="/sign-in" className="ui-auth-primary text-center no-underline">
          {t('backToSignIn')}
        </Link>
      </AuthLayout>
    </div>
  );
}
