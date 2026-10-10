'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SidebarNavGroup } from './Sidebar.NavGroup';
import { getSidebarGroups, type RoleFlags } from './sidebar.helpers';

interface SidebarBodyProps {
  roles: RoleFlags;
  /** Called after navigating; mobile sheet closes itself with this. */
  onNavigate?: () => void;
}

/**
 * Grouped navigation, Claude Design `SidebarNav` order: Dashboard opens the
 * first group. Search lives in the top bar; Notifications is the top-bar bell
 * and Settings sits in the footer menu, so the rail holds groups only.
 */
export function SidebarBody({ roles, onNavigate }: SidebarBodyProps) {
  const t = useTranslations('Sidebar');
  const groups = useMemo(() => getSidebarGroups(roles), [roles]);
  // Every path the sidebar renders — lets each item defer to a more specific
  // sibling instead of two items both claiming the active state.
  const allNavPaths = useMemo(() => groups.flatMap((g) => g.items.map((i) => i.path)), [groups]);

  return (
    <nav aria-label={t('navAriaLabel')} className="-mx-3 flex flex-1 flex-col overflow-y-auto px-3">
      {groups.map((group) => (
        <SidebarNavGroup
          key={group.id}
          group={group}
          onNavigate={onNavigate}
          allNavPaths={allNavPaths}
        />
      ))}
    </nav>
  );
}
