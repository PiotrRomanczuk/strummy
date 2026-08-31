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
  /**
   * Opt out of lazy loading for the one cover that is the focal point of its
   * view (the detail panel's hero). Everything else — above all the 50 row
   * thumbs of a songs-list page — must stay lazy: covers are Spotify CDN URLs,
   * an eager <img> is a load-event blocker, and Chromium only opens 6
   * connections per host, so 50 of them serialise into 9 waves. Measured in
   * Chromium at 50 rows: 500ms/image delays `load` to 4.5s, 1.5s to 13.6s,
   * 3s to 27.1s — past Playwright's 30s navigation budget and, long before
   * that, past what a teacher on a phone will wait for. Lazy images are
   * excluded from the document's load-blocking set entirely (~25ms).
   */
  eager?: boolean;
};

/** Song cover art, or a deterministic gradient placeholder when there is none. */
export const AlbumThumb = ({
  songId,
  coverImageUrl,
  size = 34,
  radius = 6,
  eager = false,
}: AlbumThumbProps) => {
  if (coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- decorative small thumb, not worth next/image's overhead here
      <img
        src={coverImageUrl}
        alt=""
        width={size}
        height={size}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
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
