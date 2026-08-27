'use client';

import { useState, useSyncExternalStore, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

const STORAGE_KEY = 'strummy-demo-banner-dismissed';

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerSnapshot(): boolean {
  return true; // Hide on server to avoid flash
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

/**
 * Shown across the top of the demo studio. It is the only in-product surface a
 * visitor from a campaign link reliably sees, so it carries the interest form
 * rather than a bare sign-up link: someone still deciding wants to leave a
 * contact, not create an account.
 */
export function DemoBanner() {
  const t = useTranslations('ForTeachers.banner');
  const [localDismissed, setLocalDismissed] = useState(false);
  const wasDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setLocalDismissed(true);
  }, []);

  if (wasDismissed || localDismissed) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-[#f2b127]/15 border-b border-[#f2b127]/30 px-4 py-2 text-sm text-[#f2b127]">
      <span className="truncate">
        {t('text')}{' '}
        <Link
          href="/for-teachers"
          data-testid="demo-banner-interest"
          className="font-medium underline underline-offset-2 hover:text-[#ffd183]"
        >
          {t('cta')}
        </Link>
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded hover:bg-[#f2b127]/20 transition-colors"
        aria-label={t('dismiss')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
