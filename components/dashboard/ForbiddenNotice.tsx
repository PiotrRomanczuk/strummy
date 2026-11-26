'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Shown on /dashboard after the proxy bounced the visitor from a page their
 * role may not open (`?error=forbidden`). Dismissing it also drops the query
 * parameter, so a reload does not bring it back.
 */
export const ForbiddenNotice = () => {
  const t = useTranslations('Dashboard');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const dismiss = () => {
    setIsVisible(false);
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete('error');
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div
      role="alert"
      data-testid="forbidden-notice"
      className="mx-4 mt-4 flex items-center gap-3 rounded-lg border border-[var(--rule)] bg-[var(--gold-tint)] px-4 py-3 text-sm text-[var(--ink)] sm:mx-8"
    >
      <ShieldAlert size={18} aria-hidden="true" className="shrink-0 text-[var(--gold-2)]" />
      <span className="flex-1">{t('forbiddenNotice')}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('forbiddenNoticeDismiss')}
        className="rounded p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
};
