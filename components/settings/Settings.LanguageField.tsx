'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { updateLocaleAction } from '@/app/actions/profile-settings';
import { LOCALES, isAppLocale } from '@/i18n/locales';
import { FieldLabel } from './Settings.Card';

/**
 * Language choice on the profile card. Until 2026-11 the only switch sat in
 * the sidebar's account menu, where a student who landed in the wrong
 * language had no reason to look. Applies at once — it is not part of the
 * profile form's submit.
 */
export const LanguageField = () => {
  const t = useTranslations('Settings');
  const tLang = useTranslations('LanguageToggle');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const change = (next: string) => {
    if (!isAppLocale(next) || next === locale) return;
    startTransition(async () => {
      await updateLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <div>
      <FieldLabel label={t('fieldLanguage')} />
      <select
        aria-label={t('fieldLanguage')}
        data-testid="settings-language"
        value={locale}
        disabled={isPending}
        onChange={(event) => change(event.target.value)}
        className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 py-2.5 font-[family-name:var(--sans)] text-sm text-[var(--ink)] disabled:cursor-wait"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {tLang(code === 'en' ? 'english' : 'polish')}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-[var(--ink-4)]">{t('fieldLanguageHint')}</p>
    </div>
  );
};
