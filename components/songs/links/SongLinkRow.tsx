import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { SongMissingLink } from '@/app/actions/song-links';

import { SongLinkForm } from './SongLinkForm';
import { formatDuration, youtubeSearchUrl } from './song-links.helpers';

const externalLinkClass =
  'inline-flex items-center gap-1 text-[13px] text-[var(--ink-2)] underline underline-offset-2 hover:text-[var(--ink)]';

/** A song in the missing-links queue: what it is, where to look for it, and the form that resolves it. */
export const SongLinkRow = async ({ song }: { song: SongMissingLink }) => {
  const t = await getTranslations('Songs');
  const duration = formatDuration(song.duration_ms);
  const meta = [song.category, duration && t('linksDuration', { duration })].filter(Boolean);

  return (
    <li
      data-testid="song-link-row"
      className="flex flex-col justify-between gap-4 rounded-lg border border-[var(--rule)] bg-[var(--card)] p-4 sm:flex-row sm:items-start"
    >
      <div className="min-w-0 space-y-1.5">
        <Link
          href={`/dashboard/songs/${song.id}`}
          className="block text-[15px] font-medium hover:underline"
        >
          {song.title}
        </Link>
        <div className="text-[13px] text-[var(--ink-3)]">{song.author || t('linksNoAuthor')}</div>
        {meta.length > 0 && (
          <div className="font-[family-name:var(--mono)] text-[10px] uppercase tracking-[.06em] text-[var(--ink-4)]">
            {meta.join(' · ')}
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          <a
            href={youtubeSearchUrl(song.author, song.title)}
            target="_blank"
            rel="noreferrer"
            className={externalLinkClass}
          >
            {t('linksSearchYoutube')}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          {song.spotify_link_url && (
            <a
              href={song.spotify_link_url}
              target="_blank"
              rel="noreferrer"
              className={externalLinkClass}
            >
              {t('linksOpenSpotify')}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>
      <SongLinkForm songId={song.id} songTitle={song.title} />
    </li>
  );
};
