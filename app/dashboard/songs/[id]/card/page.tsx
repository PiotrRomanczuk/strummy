import '@/app/design-tokens.css';

import { notFound } from 'next/navigation';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getSongCard } from '@/lib/services/song-card-queries';
import { getSongCardReview } from '@/lib/services/song-card-review';
import { getSongCardForStudent } from '@/lib/services/song-card-student';
import { SongCardEmpty } from '@/components/songs/song-card/SongCardEmpty';
import { SongCardHeader } from '@/components/songs/song-card/SongCardHeader';
import { SongCardView } from '@/components/songs/song-card/SongCardView';
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

/** Staff read the analysis tables (RLS); a student gets the cut-down card of a song in their repertoire. */
async function loadCard(songId: string, isStaff: boolean) {
  if (!isStaff) return getSongCardForStudent(songId);
  const card = await getSongCard(songId);
  return card ? { card, review: await getSongCardReview(songId, card.youtubeId) } : null;
}

type PageProps = {
  params: Promise<{ id: string }>;
  /** `part`, `loop`, `tempo` — a practice link opens the card there. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The song card (SNG-17): the song to play along with, drawn from the analysis of its recording. */
export default async function SongCardPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [song, { isAdmin, isTeacher }] = await Promise.all([loadSong(id), getUserWithRolesSSR()]);
  if (!song) notFound();
  const isStaff = isAdmin || isTeacher;
  const loaded = await loadCard(id, isStaff);

  return (
    <div
      className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable} min-h-full bg-[var(--ivory)] text-[13px] leading-snug text-[var(--ink)]`}
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 pb-16 pt-6 sm:px-6">
        <SongCardHeader
          songId={id}
          title={song.title ?? ''}
          author={song.author}
          card={loaded?.card ?? null}
          showCapoHint={isStaff}
        />
        {loaded ? (
          <SongCardView
            songId={id}
            card={loaded.card}
            review={loaded.review}
            isTeacher={isStaff}
            start={parseCardStart(query, loaded.card)}
            linkPath={isStaff ? `/dashboard/songs/${id}/card` : null}
            songTitle={song.title ?? ''}
          />
        ) : (
          <SongCardEmpty songId={id} isTeacher={isStaff} />
        )}
      </div>
    </div>
  );
}
