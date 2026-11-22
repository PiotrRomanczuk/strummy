import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import type { SongEntity } from '@/lib/private-data/private-data.types';
import { strummyIdsOf } from '@/lib/private-data/songs';

import { LAB_PATH } from '../lab.helpers';

type Props = { entity: SongEntity };
type HeaderLink = { label: string; href: string };

function idsOrSingle(ids: string[] | undefined, single: string | null | undefined): string[] {
  return ids ?? (single ? [single] : []);
}

/** One link per id; "Label 1", "Label 2"… only when there is more than one. */
function numbered(ids: string[], label: string, href: (id: string) => string): HeaderLink[] {
  return ids.map((id, i) => ({
    label: ids.length > 1 ? `${label} ${i + 1}` : label,
    href: href(id),
  }));
}

/** Title, artist and the song's homes elsewhere: Strummy, Spotify, YouTube. */
export async function LabEntityHeader({ entity }: Props) {
  const t = await getTranslations('Lab.entity');
  const links = [
    ...numbered(strummyIdsOf(entity), t('strummySong'), (id) => `/dashboard/songs/${id}`),
    ...numbered(
      idsOrSingle(entity.spotify_ids, entity.spotify_id),
      'Spotify',
      (id) => `https://open.spotify.com/track/${id}`
    ),
    ...numbered(
      idsOrSingle(entity.youtube_ids, entity.youtube_id),
      'YouTube',
      (id) => `https://www.youtube.com/watch?v=${id}`
    ),
  ];
  return (
    <header className="space-y-2">
      <Link
        href={`${LAB_PATH}/songs`}
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← {t('back')}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{entity.title || '—'}</h1>
      <p className="text-muted-foreground">{entity.artist}</p>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Button key={link.href} asChild variant="outline" size="sm">
              {link.href.startsWith('/') ? (
                <Link href={link.href}>{link.label}</Link>
              ) : (
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              )}
            </Button>
          ))}
        </div>
      )}
    </header>
  );
}
