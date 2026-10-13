import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { AuthHeader, AuthLayout, ResetPasswordForm } from '@/components/auth';

/**
 * Last step of the reset flow. Same card as sign-in and forgot-password —
 * this was the one auth screen still on the pre-redesign gray layout, so a
 * user went ivory → ivory → gray → ivory through a single password reset.
 */
export default async function ResetPasswordPage() {
  const t = await getTranslations('Auth');
  return (
    <AuthLayout>
      <AuthHeader
        eyebrow={t('forgotEyebrow')}
        title={t('resetPageTitle')}
        subtitle={t('resetPageSubtitle')}
      />
      <ResetPasswordForm />
      <p className="m-0 border-t border-[var(--rule)] pt-[18px] text-center text-xs text-[var(--ink-4)]">
        <Link href="/sign-in" className="font-medium text-[var(--gold-2)] no-underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </AuthLayout>
  );
}
