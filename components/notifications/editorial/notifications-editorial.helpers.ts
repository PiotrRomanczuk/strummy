/**
 * Pure helpers shared by the editorial notifications inbox components.
 */

export const VARIANT_COLOURS: Record<string, string> = {
  default: 'var(--ink-3)',
  success: 'var(--success)',
  warning: 'var(--warn)',
  error: 'var(--danger)',
  info: 'var(--info)',
};

export const formatRelative = (iso: string, now: Date): string => {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
