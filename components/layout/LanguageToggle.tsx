'use client';

import * as React from 'react';
import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { updateLocaleAction } from '@/app/actions/profile-settings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOCALES, type AppLocale } from '@/i18n/locales';

export function LanguageToggle() {
  const locale = useLocale();
  const t = useTranslations('LanguageToggle');
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const setLocale = (next: AppLocale) => {
    if (next === locale) return;
    startTransition(async () => {
      await updateLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending}>
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('label')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLocale(code)}
            className={code === locale ? 'font-semibold' : undefined}
          >
            {t(code === 'en' ? 'english' : 'polish')}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
