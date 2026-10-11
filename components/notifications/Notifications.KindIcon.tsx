import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Hand,
  Star,
  type LucideIcon,
} from 'lucide-react';

export type NotificationCategory = 'lessons' | 'practice' | 'system';

type KindMeta = { icon: LucideIcon; color: string; category: NotificationCategory };

const SYSTEM: KindMeta = { icon: Bell, color: 'var(--ink-3)', category: 'system' };

/** Claude Design activity-feed kinds: a tinted tile and a filter category per type. */
export const kindMeta = (type: string, variant: string | null): KindMeta => {
  if (variant === 'error' || type.includes('overdue'))
    return { icon: AlertTriangle, color: 'var(--danger)', category: 'practice' };
  if (type.startsWith('lesson'))
    return { icon: CalendarDays, color: 'var(--info)', category: 'lessons' };
  if (type === 'assignment_completed')
    return { icon: CheckCircle2, color: 'var(--success)', category: 'practice' };
  if (type.startsWith('assignment'))
    return { icon: ClipboardList, color: 'var(--gold-2)', category: 'practice' };
  if (type.includes('mastery') || type.includes('milestone'))
    return { icon: Star, color: 'var(--gold-2)', category: 'practice' };
  if (type.includes('welcome')) return { icon: Hand, color: 'var(--gold-2)', category: 'system' };
  return SYSTEM;
};

export const NotificationKindIcon = ({
  type,
  variant,
}: {
  type: string;
  variant: string | null;
}) => {
  const { icon: Icon, color } = kindMeta(type, variant);
  return (
    <span
      aria-hidden="true"
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        color,
        background: `color-mix(in oklab, ${color} 12%, var(--card))`,
      }}
    >
      <Icon size={16} strokeWidth={1.7} />
    </span>
  );
};
