import { Bell, LayoutDashboard, Settings, type LucideIcon } from 'lucide-react';
import { getMenuGroups, type MenuGroup, type MenuItem } from '@/components/navigation/menuConfig';

export interface RoleFlags {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent?: boolean;
  isDemoAccount?: boolean;
}

export interface SidebarGroup extends MenuGroup {
  /** Stable identifier for collapse persistence. */
  id: string;
}

export interface SidebarSoloItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export const HOME_ITEM: SidebarSoloItem = {
  id: 'home',
  label: 'Dashboard',
  icon: LayoutDashboard,
  path: '/dashboard',
};

/**
 * NOT-4: `/dashboard/notifications` renders for both roles but nothing linked to
 * it — `menuConfig`'s NOTIFICATION_ITEM was exported and never mounted, so the
 * inbox was reachable only by typing the URL.
 */
export const NOTIFICATIONS_ITEM: SidebarSoloItem = {
  id: 'notifications',
  label: 'Notifications',
  icon: Bell,
  path: '/dashboard/notifications',
};

export const SETTINGS_ITEM: SidebarSoloItem = {
  id: 'settings',
  label: 'Settings',
  icon: Settings,
  path: '/dashboard/settings',
};

/**
 * Returns role-filtered groups with stable ids, derived from the central menu config.
 * Empty groups are dropped so the Practice / Admin sections only appear when populated.
 */
export function getSidebarGroups(roles: RoleFlags): SidebarGroup[] {
  return getMenuGroups(roles)
    .filter((g) => g.items.length > 0)
    .map((g) => ({ ...g, id: g.label.toLowerCase().replace(/\s+/g, '-') }));
}

export function getRoleLabel(
  roles: Pick<RoleFlags, 'isAdmin' | 'isTeacher' | 'isStudent' | 'isParent'>
): string {
  if (roles.isAdmin) return 'Admin';
  if (roles.isTeacher) return 'Teacher';
  if (roles.isStudent) return 'Student';
  // Parent ranks last: a guardian who also studies is shown as Student, matching
  // the highest-role-wins precedence the dashboard view selection uses.
  if (roles.isParent) return 'Parent';
  return 'User';
}

export function filterGroups(groups: SidebarGroup[], query: string): SidebarGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => it.label.toLowerCase().includes(q)),
    }))
    .filter((g) => g.items.length > 0);
}

export function matchesItem(item: SidebarSoloItem | MenuItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.label.toLowerCase().includes(q);
}
