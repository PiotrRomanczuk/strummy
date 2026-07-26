import { Card, CardHeader } from './primitives';

type Props = {
  ultimateGuitarLink: string | null | undefined;
  youtubeUrl: string | null | undefined;
  spotifyLinkUrl: string | null | undefined;
  tiktokShortUrl: string | null | undefined;
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const ResourceRow = ({ label, url, isLast }: { label: string; url: string; isLast: boolean }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      paddingBottom: isLast ? 0 : 10,
      borderBottom: isLast ? 'none' : '1px solid var(--rule-2)',
    }}
  >
    <span style={{ minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
      <span
        style={{
          display: 'block',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {hostOf(url)}
      </span>
    </span>
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontFamily: 'var(--sans)',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--gold-2)',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      Open →
    </a>
  </div>
);

/**
 * External resources attached to the song (tab, video, streaming links).
 * These columns are filled by the edit form and importers but were previously
 * never displayed anywhere. Visible to every role — students need the tab and
 * video links even more than staff do. Returns null when no link is on file.
 */
export const SongResourcesCardEditorial = ({
  ultimateGuitarLink,
  youtubeUrl,
  spotifyLinkUrl,
  tiktokShortUrl,
}: Props) => {
  const rows = [
    { label: 'Ultimate Guitar tab', url: ultimateGuitarLink },
    { label: 'YouTube video', url: youtubeUrl },
    { label: 'Spotify', url: spotifyLinkUrl },
    { label: 'TikTok short', url: tiktokShortUrl },
  ].filter((row): row is { label: string; url: string } => Boolean(row.url?.trim()));

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader eyebrow="Tabs & media" title="Resources" />
      <div style={{ padding: '0 24px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, i) => (
          <ResourceRow
            key={row.label}
            label={row.label}
            url={row.url}
            isLast={i === rows.length - 1}
          />
        ))}
      </div>
    </Card>
  );
};
