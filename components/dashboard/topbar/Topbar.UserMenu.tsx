'use client';

import Link from 'next/link';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopbarUserMenuProps {
  email: string;
  fullName?: string | null;
}

function initialsFor(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'U';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

export function TopbarUserMenu({ email, fullName }: TopbarUserMenuProps) {
  const t = useTranslations('Topbar');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 px-2"
          data-testid="topbar-user-menu-trigger"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initialsFor(fullName, email)}</AvatarFallback>
          </Avatar>
          {/* Bounded and truncated, like every other place the display name is
              shown (Sidebar, Sidebar.Footer, Sidebar.MobileSheet all `truncate`).
              The Button base sets `whitespace-nowrap shrink-0`, so an unbounded
              name grows the trigger to the width of the text and pushes it past
              the right edge of the topbar. `DropdownMenuContent align="end"`
              then anchors to an off-screen edge, and the menu item — visible,
              but never settling while Floating UI re-solves against a
              horizontally overflowing document — cannot be clicked. That is
              what broke A1.2 sign-out on iPad Pro (834px, the narrowest width
              where `md:` shows the name at all). */}
          <span className="hidden max-w-[12rem] truncate text-sm md:inline-block">
            {fullName || email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{fullName || t('account')}</span>
            <span className="text-muted-foreground text-xs">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile" data-testid="topbar-profile-link">
            <UserIcon className="mr-2 h-4 w-4" />
            {t('profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Navigation, not a handler — the session is a server cookie and only
            the route handler can clear it. */}
        <DropdownMenuItem asChild data-testid="topbar-signout">
          <a href="/auth/signout">
            <LogOut className="mr-2 h-4 w-4" />
            {t('signOut')}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
