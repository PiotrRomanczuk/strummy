'use client';

import Link from 'next/link';
import { Shield, GraduationCap, Guitar, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Role {
  id: string;
  label: string;
  icon: LucideIcon;
  param: string;
}

interface RoleSwitcherProps {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  /** Parent of a linked child: the family dashboard is one more view. */
  isParent?: boolean;
  /** Which view is currently active */
  activeView: string;
  className?: string;
}

export function RoleSwitcher({
  isAdmin,
  isTeacher,
  isStudent,
  isParent = false,
  activeView,
  className,
}: RoleSwitcherProps) {
  const t = useTranslations('Roles');
  const roles: Role[] = [];

  if (isTeacher) roles.push({ id: 'teacher', label: t('teacher'), icon: Guitar, param: 'teacher' });
  if (isStudent)
    roles.push({ id: 'student', label: t('student'), icon: GraduationCap, param: 'student' });
  if (isParent) roles.push({ id: 'parent', label: t('parent'), icon: Users, param: 'parent' });
  if (isAdmin) roles.push({ id: 'admin', label: t('admin'), icon: Shield, param: 'admin' });

  // Don't show switcher if user has only one role
  if (roles.length <= 1) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border',
        className
      )}
    >
      {roles.map((role) => {
        const Icon = role.icon;
        const isActive = activeView === role.id;

        return (
          <Link
            key={role.id}
            href={`/dashboard?view=${role.param}`}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              'min-h-[32px]',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{role.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
