'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SidebarNavGroup } from './Sidebar.NavGroup';
import { SidebarNavItem } from './Sidebar.NavItem';
import { SidebarSearch } from './Sidebar.Search';
import {
  filterGroups,
  getSidebarGroups,
  HOME_ITEM,
  matchesItem,
  NOTIFICATIONS_ITEM,
  type RoleFlags,
  SETTINGS_ITEM,
} from './sidebar.helpers';

interface SidebarBodyProps {
  roles: RoleFlags;
  /** Called after navigating; mobile sheet closes itself with this. */
  onNavigate?: () => void;
}

export function SidebarBody({ roles, onNavigate }: SidebarBodyProps) {
  const t = useTranslations('Sidebar');
  const [query, setQuery] = useState('');
  const groups = useMemo(() => getSidebarGroups(roles), [roles]);
  const visibleGroups = useMemo(() => filterGroups(groups, query), [groups, query]);
  // Every path the sidebar actually renders — lets each item defer to a more
  // specific sibling instead of two items both claiming the active state.
  const allNavPaths = useMemo(
    () => [
      HOME_ITEM.path,
      NOTIFICATIONS_ITEM.path,
      SETTINGS_ITEM.path,
      ...groups.flatMap((g) => g.items.map((i) => i.path)),
    ],
    [groups]
  );
  const homeVisible = matchesItem(HOME_ITEM, query);
  const notificationsVisible = matchesItem(NOTIFICATIONS_ITEM, query);
  const settingsVisible = matchesItem(SETTINGS_ITEM, query);
  const empty =
    visibleGroups.length === 0 && !homeVisible && !settingsVisible && !notificationsVisible;

  return (
    <>
      <div className="px-3 pt-3 pb-2">
        <SidebarSearch value={query} onChange={setQuery} />
      </div>
      <nav
        aria-label={t('navAriaLabel')}
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3"
      >
        {homeVisible && (
          <div className="mt-1">
            <SidebarNavItem
              isHome
              id={HOME_ITEM.id}
              label={HOME_ITEM.label}
              href={HOME_ITEM.path}
              icon={HOME_ITEM.icon}
              onNavigate={onNavigate}
            />
          </div>
        )}
        {visibleGroups.map((group) => (
          <SidebarNavGroup
            key={group.id}
            group={group}
            onNavigate={onNavigate}
            allNavPaths={allNavPaths}
          />
        ))}
        {(notificationsVisible || settingsVisible) && (
          <div className="mt-3 flex flex-col gap-0.5 border-t pt-2">
            {notificationsVisible && (
              <SidebarNavItem
                id={NOTIFICATIONS_ITEM.id}
                label={NOTIFICATIONS_ITEM.label}
                href={NOTIFICATIONS_ITEM.path}
                icon={NOTIFICATIONS_ITEM.icon}
                onNavigate={onNavigate}
              />
            )}
            {settingsVisible && (
              <SidebarNavItem
                id={SETTINGS_ITEM.id}
                label={SETTINGS_ITEM.label}
                href={SETTINGS_ITEM.path}
                icon={SETTINGS_ITEM.icon}
                onNavigate={onNavigate}
              />
            )}
          </div>
        )}
        {empty && (
          <p className="text-muted-foreground px-3 py-4 text-xs">{t('noMatches', { query })}</p>
        )}
      </nav>
    </>
  );
}
