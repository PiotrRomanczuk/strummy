'use client';

import { useTranslations } from 'next-intl';
import { SidebarNavItem } from './Sidebar.NavItem';
import type { SidebarGroup } from './sidebar.helpers';

interface SidebarNavGroupProps {
  group: SidebarGroup;
  onNavigate?: () => void;
  /** Every rendered nav path, so an item can defer to a more specific sibling. */
  allNavPaths?: readonly string[];
}

/** One labelled group — static uppercase label, as in the Claude Design rail. */
export function SidebarNavGroup({ group, onNavigate, allNavPaths }: SidebarNavGroupProps) {
  const t = useTranslations('Nav');

  return (
    <div className="mt-2" data-testid={`sidebar-group-${group.id}`}>
      <p className="px-2.5 pt-2 pb-1 text-[10px] font-medium tracking-[0.14em] text-[var(--ink-4)] uppercase">
        {t(`groups.${group.id}`)}
      </p>
      <div id={`sidebar-group-${group.id}`} className="flex flex-col">
        {group.items.map((item) => (
          <SidebarNavItem
            key={item.id}
            id={item.id}
            label={item.label}
            href={item.path}
            icon={item.icon}
            isHome={item.id === 'home'}
            onNavigate={onNavigate}
            allNavPaths={allNavPaths}
          />
        ))}
      </div>
    </div>
  );
}
