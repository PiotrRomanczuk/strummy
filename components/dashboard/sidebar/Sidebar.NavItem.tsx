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
        'relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors',
        'hover:bg-[var(--rule-2)] hover:text-[var(--ink)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none',
        active
          ? 'bg-[var(--rule-2)] font-medium text-[var(--ink)]'
          : 'font-normal text-[var(--ink-3)]'
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-[3px] bg-[var(--gold)]"
        />
      )}
      <Icon className="size-[15px] shrink-0" strokeWidth={1.6} aria-hidden="true" />
      <span className="truncate">{t(id)}</span>
    </Link>
  );
}
