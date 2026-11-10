import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getSongsMissingLink } from '@/app/actions/song-links';
import { SongLinkRow } from '@/components/songs/links/SongLinkRow';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['400', '500', '600'],
  display: 'swap',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

const noticeClass =
  'rounded-lg border border-[var(--rule)] bg-[var(--card)] px-6 py-12 text-center font-[family-name:var(--serif)] text-[15px] italic text-[var(--ink-4)]';

/** Staff queue: songs with no YouTube link, each resolved by pasting one or filing the entry as having no recording. */
export default async function SongLinksPage() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) redirect('/sign-in?redirect=/dashboard/songs/links');
  if (!isAdmin && !isTeacher) redirect('/dashboard/songs');

  const t = await getTranslations('Songs');
  const { songs, error } = await getSongsMissingLink();

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <div className="min-h-full bg-[var(--ivory)] px-4 pb-16 pt-7 text-[var(--ink)] sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-start gap-3">
            <Link
              href="/dashboard/songs"
              aria-label={t('linksBack')}
              className="mt-1 rounded-full p-2 text-[var(--ink-3)] hover:bg-[var(--card)]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-[family-name:var(--serif)] text-[34px] italic leading-tight tracking-[-0.02em]">
                {t('linksTitle')}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[13px] text-[var(--ink-3)]">{t('linksIntro')}</p>
              {!error && (
                <p className="mt-1.5 text-[13px] text-[var(--ink-2)]">
                  {t('linksCount', { count: songs.length })}
                </p>
              )}
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
            >
              {t('linksLoadFailed')}
            </div>
          ) : songs.length === 0 ? (
            <div className={noticeClass}>{t('linksEmpty')}</div>
          ) : (
            <ul className="space-y-3">
              {songs.map((song) => (
                <SongLinkRow key={song.id} song={song} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
