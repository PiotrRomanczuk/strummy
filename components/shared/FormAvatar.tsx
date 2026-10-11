import { avatarColorFor } from './avatar-color.helpers';

export const initialsFor = (name: string | null, email: string | null): string => {
  const src = (name && name.trim()) || (email && email.trim()) || '';
  if (!src) return '—';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0] ?? '?')[0].toUpperCase();
};

type Props = {
  name: string | null;
  email?: string | null;
  size?: number;
  /** Stored or picked avatar colour; otherwise a stable per-name one. */
  color?: string | null;
};

/** Claude Design `Avatar` for previews and chips: solid swatch, white sans initials. */
export const FormAvatar = ({ name, email = null, size = 28, color }: Props) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: name || email || color ? avatarColorFor(name ?? email, color) : 'var(--gold)',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--on-accent)',
      fontFamily: 'var(--sans)',
      fontSize: Math.max(10, Math.round(size * 0.38)),
      fontWeight: 600,
    }}
  >
    {initialsFor(name, email)}
  </div>
);
