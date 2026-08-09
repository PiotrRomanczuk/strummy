'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { MenuIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PickMark } from '@/components/shared/BrandMark';
import { SidebarBody } from './Sidebar.Body';
import { SidebarFooter } from './Sidebar.Footer';
import type { RoleFlags } from './sidebar.helpers';

interface SidebarMobileSheetProps {
  roles: RoleFlags;
  email: string;
  fullName?: string | null;
  roleLabel: string;
}

export function SidebarMobileSheet({ roles, email, fullName, roleLabel }: SidebarMobileSheetProps) {
  const t = useTranslations('Sidebar');
  const [isOpen, setIsOpen] = useState(false);
  const handleNavigate = useCallback(() => setIsOpen(false), []);
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * Radix focuses the drawer's first focusable element on open. That is the
   * search box, so opening the menu on a phone raised the on-screen keyboard —
   * which then covered most of the navigation the user opened the menu to use.
   *
   * Focus still has to enter the drawer (screen readers announce it, and Escape
   * and the focus trap depend on it), so this moves focus to the content
   * container rather than dropping it: the panel is announced, nothing is
   * typed into, and Tab from there reaches search first anyway.
   */
  const focusPanelNotSearch = useCallback((event: Event) => {
    event.preventDefault();
    contentRef.current?.focus();
  }, []);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('openNavigation')}
          data-testid="sidebar-mobile-trigger"
          className="md:hidden"
        >
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        ref={contentRef}
        side="left"
        className="bg-sidebar flex w-72 flex-col p-0"
        data-testid="sidebar-mobile"
        onOpenAutoFocus={focusPanelNotSearch}
      >
        <SheetHeader className="border-b p-0">
          <SheetTitle asChild>
            <Link
              href="/dashboard"
              onClick={handleNavigate}
              className="flex h-14 items-center gap-2.5 px-4"
            >
              <div className="bg-muted grid size-8 place-items-center rounded-lg">
                <PickMark size={18} />
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate font-serif text-base leading-tight font-semibold tracking-[-0.01em]">
                  Strummy
                </p>
                <p className="text-muted-foreground truncate font-mono text-[10px] uppercase tracking-[0.1em]">
                  {roleLabel}
                </p>
              </div>
            </Link>
          </SheetTitle>
        </SheetHeader>
        <SidebarBody roles={roles} onNavigate={handleNavigate} />
        <SidebarFooter email={email} fullName={fullName} roleLabel={roleLabel} />
      </SheetContent>
    </Sheet>
  );
}
