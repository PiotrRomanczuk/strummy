'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarNavItemProps {
  /** Stable menu-item id (see menuConfig.ts) — resolved to display text via Nav.<id>. */
  id: string;
  /** Stable English text — kept for `data-nav-item`, which E2E specs and the demo tour key on. */
  label: string;
  href: string;
  icon: LucideIcon;
  isHome?: boolean;
  onNavigate?: () => void;
  /** Every rendered nav path, so an item can defer to a more specific sibling. */
  allNavPaths?: readonly string[];
}

/**
 * Prefix matching is right in general — `/dashboard/lessons/123` should light up
 * "Lessons". It breaks only when another nav item is a *more specific* path:
 * on `/dashboard/ai/chat` both "AI Assistant" (`/dashboard/ai`) and "AI Chat"
 * matched, so two items rendered active at once. An item therefore loses to any
 * sibling whose path is a longer match for the same URL.
 */
export function isActive(
  pathname: string | null,
  href: string,
  isHome?: boolean,
  allNavPaths: readonly string[] = []
): boolean {
  if (!pathname) return false;
  if (isHome) return pathname === href;
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  return !allNavPaths.some(
    (other) =>
      other.length > href.length &&
      (pathname === other || pathname.startsWith(`${other}/`)) &&
      other.startsWith(`${href}/`)
  );
}

export function SidebarNavItem({
  id,
  label,
  href,
  icon: Icon,
  isHome,
  onNavigate,
  allNavPaths,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const active = isActive(pathname, href, isHome, allNavPaths);
  const t = useTranslations('Nav');

  return (
    <Link
      href={href}
      onClick={onNavigate}
      data-nav-item={label}
      data-active={active ? 'true' : 'false'}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'mx-1 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
        'hover:bg-muted/70 hover:text-foreground',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        active
          ? 'bg-primary/10 text-primary dark:bg-primary/15 font-medium'
          : 'text-muted-foreground font-normal'
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{t(id)}</span>
    </Link>
  );
}
