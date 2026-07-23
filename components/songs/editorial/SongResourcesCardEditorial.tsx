import type { Song } from '@/components/songs/types';

import { Card, CardHeader } from './primitives';

type LinkFields = Pick<
  Song,
  'youtube_url' | 'spotify_link_url' | 'ultimate_guitar_link' | 'tiktok_short_url'
>;

type Props = { song: LinkFields };

const LINKS: { key: keyof LinkFields; label: string }[] = [
  { key: 'youtube_url', label: 'YouTube' },
  { key: 'spotify_link_url', label: 'Spotify' },
  { key: 'ultimate_guitar_link', label: 'Ultimate Guitar' },
  { key: 'tiktok_short_url', label: 'TikTok' },
];

/**
 * External practice-resource links on the song detail page. Teachers attach
 * these in the song form and the page query already selects them, but no
 * component ever rendered them — so students couldn't reach the YouTube /
 * tab / Spotify links their teacher added. Returns null when a song has none.
 */
export const SongResourcesCardEditorial = ({ song }: Props) => {
  const present = LINKS.filter((l) => {
    const v = song[l.key];
    return typeof v === 'string' && v.trim() !== '';
  });
  if (present.length === 0) return null;

  return (
    <Card>
      <CardHeader eyebrow="Practice links" title="Resources" />
      <div style={{ padding: '0 24px 22px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {present.map((l) => (
          <a
            key={l.key}
            href={song[l.key] as string}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              border: '1px solid var(--rule)',
              borderRadius: 999,
              background: 'var(--paper)',
              fontSize: 13,
              color: 'var(--ink-2)',
              textDecoration: 'none',
            }}
          >
            {l.label} ↗
          </a>
        ))}
      </div>
    </Card>
  );
};
