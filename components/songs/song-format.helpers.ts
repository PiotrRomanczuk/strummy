export { levelLabel } from '@/components/shared/level-label.helpers';

export const msToClock = (ms: number | null): string => {
  if (ms == null || ms < 0) return '';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** "Jul 2026" / "lip 2026" — the app locale, passed in by the caller. */
export const monthYear = (
  iso: string | null,
  t: (key: string) => string,
  locale = 'en'
): string => {
  if (!iso) return t('recently');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t('recently');
  return d.toLocaleDateString(locale.startsWith('en') ? 'en-US' : locale, {
    month: 'short',
    year: 'numeric',
  });
};

export const minutesLabel = (totalMinutes: number): string => {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  return `${hours}h${totalMinutes % 60 > 0 ? ` ${totalMinutes % 60}m` : ''}`;
};

export const firstNameWithInitial = (fullName: string | null, fallback: string): string => {
  if (!fullName) return fallback;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return fallback;
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last[0]}.`;
};
