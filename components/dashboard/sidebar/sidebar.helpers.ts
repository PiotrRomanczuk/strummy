import { LayoutDashboard, type LucideIcon } from 'lucide-react';
import {
  getMenuGroups,
  type MenuGroup,
  type MenuItem,
} from '@/components/navigation/menu.constants';

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
 * Returns role-filtered groups with stable ids, derived from the central menu config.
 * Empty groups are dropped so the Practice / Admin sections only appear when populated.
 */
export function getSidebarGroups(roles: RoleFlags): SidebarGroup[] {
  const groups = getMenuGroups(roles)
    .filter((g) => g.items.length > 0)
    .map((g) => ({ ...g, id: g.label.toLowerCase().replace(/\s+/g, '-') }));
  // Claude Design `SidebarNav`: Dashboard is the first item of the first group,
  // not a solo row above the groups. A parent has no groups — Dashboard alone.
  if (groups.length === 0) return [{ id: 'home', label: 'Home', items: [HOME_ITEM] }];
  const [first, ...rest] = groups;
  return [{ ...first, items: [HOME_ITEM, ...first.items] }, ...rest];
}

export function getRoleLabel(
  roles: Pick<RoleFlags, 'isAdmin' | 'isTeacher' | 'isStudent' | 'isParent'>,
  t: (key: string) => string
): string {
  if (roles.isAdmin) return t('admin');
  if (roles.isTeacher) return t('teacher');
  if (roles.isStudent) return t('student');
  // Parent ranks last: a guardian who also studies is shown as Student, matching
  // the highest-role-wins precedence the dashboard view selection uses.
  if (roles.isParent) return t('parent');
  return t('user');
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

export function getInitials(fullName?: string | null, email?: string): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }
  return (email?.[0] ?? '?').toUpperCase();
}
