'use client';

import { useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { updateLocaleAction } from '@/app/actions/profile-settings';
import { LOCALES, type AppLocale } from '@/i18n/locales';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Account menu behind the footer's name block. The Claude Design footer shows
 * only identity + sign-out, so Settings, language and theme live in here.
 */
export function SidebarUserMenu({ children }: { children: ReactNode }) {
  const t = useTranslations('Sidebar');
  const tNav = useTranslations('Nav');
  const tLang = useTranslations('LanguageToggle');
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const setLocale = (next: string) => {
    if (next === locale) return;
    startTransition(async () => {
      await updateLocaleAction(next as AppLocale);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" data-testid="sidebar-settings-link">
            {tNav('settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isPending}>{tLang('label')}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={locale} onValueChange={setLocale}>
              {LOCALES.map((code) => (
                <DropdownMenuRadioItem key={code} value={code}>
                  {tLang(code === 'en' ? 'english' : 'polish')}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t('theme')}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">{t('themeLight')}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">{t('themeDark')}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">{t('themeSystem')}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
