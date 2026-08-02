import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentSongOfTheWeek } from '@/app/actions/song-of-the-week';
import { Music, ArrowRight } from 'lucide-react';
import { AddSotwToRepertoireButton } from './AddSotwToRepertoireButton';

export async function SongOfTheWeekBanner({ studentId }: { studentId?: string }) {
  const sotw = await getCurrentSongOfTheWeek();
  if (!sotw) return null;

  const t = await getTranslations('Dashboard');

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 opacity-5 text-blue-900 pointer-events-none">
        <Music className="w-48 h-48" />
      </div>

      <div className="relative z-10 flex-1">
        <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm uppercase tracking-wider mb-2">
          <Music className="w-4 h-4" />
          <span>{t('songOfTheWeek', { fallback: 'Song of the Week' })}</span>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-serif text-gray-900 mb-1">
          {sotw.song.title}
        </h2>
        
        {sotw.song.author && (
          <div className="text-gray-600 text-lg mb-3">
            by {sotw.song.author}
          </div>
        )}

        {sotw.teacher_message && (
          <div className="bg-white/60 p-3 rounded-md text-gray-800 italic text-sm border border-blue-50/50 max-w-2xl">
            "{sotw.teacher_message}"
          </div>
        )}
      </div>

      <div className="relative z-10 shrink-0 flex flex-col gap-3 min-w-[200px]">
        <Link 
          href={`/dashboard/songs/${sotw.song_id}`}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-lg font-medium transition-colors w-full"
        >
          {t('viewSong', { fallback: 'View Song' })}
          <ArrowRight className="w-4 h-4" />
        </Link>
        
        {studentId && (
          <AddSotwToRepertoireButton />
        )}
      </div>
    </div>
  );
}
