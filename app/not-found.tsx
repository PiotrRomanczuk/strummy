import '@/app/design-tokens.css';

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { dashboardFontVariables } from '@/lib/config/dashboard-fonts';

/**
 * 404 in the app's own voice: mono eyebrow, serif heading, ink button. The
 * previous version was the one screen still in bold sans with a brown
 * primary — it read as a different product (walkthrough review, P4).
 */
export default async function NotFound() {
  const t = await getTranslations('NotFound');
  return (
    <div
      className={`theme-strummy ${dashboardFontVariables} flex min-h-screen items-center justify-center bg-[var(--ivory)] p-4 text-[var(--ink)]`}
    >
      <div className="w-full max-w-md text-center">
        <p className="m-0 font-[family-name:var(--mono)] text-[11px] uppercase tracking-[.16em] text-[var(--ink-4)]">
          {t('eyebrow')}
        </p>
        <h1 className="mt-2 mb-0 font-[family-name:var(--serif)] text-[34px] font-normal leading-tight tracking-[-0.02em]">
          {t('title')}
        </h1>
        <p className="mt-3 mb-6 text-sm text-[var(--ink-3)]">{t('body')}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-[10px] bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--paper)] no-underline"
        >
          {t('cta')}
        </Link>
      </div>
    </div>
  );
}
