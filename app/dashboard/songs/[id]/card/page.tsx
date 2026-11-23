import '@/app/design-tokens.css';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { getTranslations } from 'next-intl/server';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getSongCard } from '@/lib/services/song-card-queries';
import { getSongCardReview } from '@/lib/services/song-card-review';
import { SongCardHeader } from '@/components/songs/song-card/SongCardHeader';
import { SongCardView } from '@/components/songs/song-card/SongCardView';
import { cardSection, hint } from '@/components/songs/song-card/song-card.styles';
import { parseCardStart } from '@/components/songs/song-card/song-card-link.helpers';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
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
  style: ['normal', 'italic'],
  display: 'swap',
});

async function loadSong(songId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, author')
    .eq('id', songId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) logger.error('[song card page] song fetch error', error);
  return data;
}

type PageProps = {
  params: Promise<{ id: string }>;
  /** `part`, `loop`, `tempo` — a practice link opens the card there. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The song card (SNG-17): the song to play along with, drawn from the analysis of its recording. Staff for now. */
export default async function SongCardPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [song, { isAdmin, isTeacher }] = await Promise.all([loadSong(id), getUserWithRolesSSR()]);
  if (!song) notFound();
  if (!isAdmin && !isTeacher) redirect(`/dashboard/songs/${id}`);

  const [card, t] = await Promise.all([getSongCard(id), getTranslations('SongCard')]);
  const review = card ? await getSongCardReview(id, card.youtubeId) : null;

  return (
    <div
      className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable} min-h-full bg-[var(--ivory)] text-[13px] leading-snug text-[var(--ink)]`}
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 pb-16 pt-6 sm:px-6">
        <SongCardHeader
          songId={id}
          title={song.title ?? ''}
          author={song.author}
          card={card}
          showCapoHint
        />
        {card && review ? (
          <SongCardView
            songId={id}
            card={card}
            review={review}
            isTeacher
            start={parseCardStart(query, card)}
            linkPath={`/dashboard/songs/${id}/card`}
          />
        ) : (
          <section className={cardSection} data-testid="song-card-empty">
            <p className="font-serif text-xl text-[var(--ink)]">{t('noAnalysisTitle')}</p>
            <p className={hint}>{t('noAnalysisBody')}</p>
            <Link
              href={`/dashboard/songs/${id}`}
              className="self-start text-sm font-medium text-[var(--ink)] underline underline-offset-2"
            >
              {t('backToSong')}
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
