import { getTranslations } from 'next-intl/server';

import { Card, CardHeader } from './SongPrimitives';

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

const ResourceRow = ({
  label,
  url,
  isLast,
  openLabel,
}: {
  label: string;
  url: string;
  isLast: boolean;
  openLabel: string;
}) => (
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
      {openLabel}
    </a>
  </div>
);

/**
 * External resources attached to the song (tab, video, streaming links).
 * These columns are filled by the edit form and importers but were previously
 * never displayed anywhere. Visible to every role — students need the tab and
 * video links even more than staff do. Returns null when no link is on file.
 */
export const SongResourcesCard = async ({
  ultimateGuitarLink,
  youtubeUrl,
  spotifyLinkUrl,
  tiktokShortUrl,
}: Props) => {
  const t = await getTranslations('Songs');
  const rows = [
    { label: t('labelUltimateGuitar'), url: ultimateGuitarLink },
    { label: t('labelYoutube'), url: youtubeUrl },
    { label: t('labelSpotify'), url: spotifyLinkUrl },
    { label: t('labelTiktok'), url: tiktokShortUrl },
  ].filter((row): row is { label: string; url: string } => Boolean(row.url?.trim()));

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader eyebrow={t('resourcesEyebrow')} title={t('resourcesTitle')} />
      <div style={{ padding: '0 24px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, i) => (
          <ResourceRow
            key={row.label}
            label={row.label}
            url={row.url}
            isLast={i === rows.length - 1}
            openLabel={t('openLink')}
          />
        ))}
      </div>
    </Card>
  );
};
