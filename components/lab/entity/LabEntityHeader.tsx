import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import type { SongEntity } from '@/lib/private-data/private-data.types';

import { LAB_PATH } from '../lab.helpers';

type Props = { entity: SongEntity };

/** Title, artist and the song's homes elsewhere: Strummy, Spotify, YouTube. */
export async function LabEntityHeader({ entity }: Props) {
  const t = await getTranslations('Lab.entity');
  const links = [
    entity.strummy_song_id && { label: t('strummySong'), href: `/dashboard/songs/${entity.strummy_song_id}` },
    entity.spotify_id && { label: 'Spotify', href: `https://open.spotify.com/track/${entity.spotify_id}` },
    entity.youtube_id && { label: 'YouTube', href: `https://www.youtube.com/watch?v=${entity.youtube_id}` },
  ].filter((link): link is { label: string; href: string } => Boolean(link));
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
            <Button key={link.label} asChild variant="outline" size="sm">
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
