/** Deterministic 3-stop gradient for songs without cover art — same id, same look. */
const GRADIENT_PALETTE = [
  'var(--gold-dim)',
  'var(--gold-2)',
  'var(--ink-2)',
  'var(--ink-4)',
  'var(--success)',
  'var(--info)',
  'var(--danger)',
];

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const gradientForSong = (songId: string): string => {
  const hash = hashString(songId);
  // `>>>` (unsigned shift), not `>>` — `hash` can exceed 2^31, and a signed
  // shift on values that large produces a negative index, which made
  // GRADIENT_PALETTE[...] resolve to `undefined` and rendered as a blank box.
  const a = GRADIENT_PALETTE[hash % GRADIENT_PALETTE.length];
  const b = GRADIENT_PALETTE[(hash >>> 3) % GRADIENT_PALETTE.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
};

type AlbumThumbProps = {
  songId: string;
  coverImageUrl?: string | null;
  size?: number;
  radius?: number;
};

/** Song cover art, or a deterministic gradient placeholder when there is none. */
export const AlbumThumb = ({ songId, coverImageUrl, size = 34, radius = 6 }: AlbumThumbProps) => {
  if (coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- decorative small thumb, not worth next/image's overhead here
      <img
        src={coverImageUrl}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: 'cover',
          flex: '0 0 auto',
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flex: '0 0 auto',
        background: gradientForSong(songId),
        boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.2)',
      }}
    />
  );
};
