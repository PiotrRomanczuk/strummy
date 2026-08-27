import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentSongOfTheWeek } from '@/app/actions/song-of-the-week';
import { Music, ArrowRight } from 'lucide-react';
import { AddSotwToRepertoireButton } from './AddSotwToRepertoireButton';

/**
 * Featured song banner at the top of the student dashboard.
 *
 * Restyled 2026-08-16: it was the one card on the page painted in hardcoded
 * Tailwind blues (`from-blue-50`, `bg-blue-600`, `text-gray-900`) with no dark
 * variants, so it read as a foreign component sitting above cards drawn from
 * `--card` / `--rule` / `--gold-2`. It now uses the same tokens as its
 * neighbours, which also makes it theme-correct for free.
 */
const shellStyle = {
  position: 'relative' as const,
  overflow: 'hidden',
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 18,
  boxShadow: '0 1px 2px rgba(26,22,19,.04), 0 10px 40px -20px rgba(26,22,19,.08)',
  padding: 24,
  marginBottom: 32,
};

const eyebrowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '.14em',
  color: 'var(--gold-2)',
  marginBottom: 8,
};

const titleStyle = {
  fontFamily: 'var(--serif)',
  fontSize: 26,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: 'var(--ink)',
  margin: 0,
};

const quoteStyle = {
  marginTop: 12,
  padding: 12,
  borderRadius: 10,
  border: '1px solid var(--rule)',
  background: 'var(--ivory)',
  color: 'var(--ink-2)',
  fontStyle: 'italic' as const,
  fontSize: 13,
  maxWidth: '42rem',
};

const ctaStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  background: 'var(--ink)',
  color: 'var(--ivory)',
  padding: '10px 24px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
};

const Watermark = () => (
  <div
    aria-hidden
    style={{
      position: 'absolute',
      right: -48,
      top: -48,
      opacity: 0.05,
      color: 'var(--gold-2)',
      pointerEvents: 'none',
    }}
  >
    <Music className="h-48 w-48" />
  </div>
);

export async function SongOfTheWeekBanner({ studentId }: { studentId?: string }) {
  const sotw = await getCurrentSongOfTheWeek();
  if (!sotw) return null;

  const t = await getTranslations('Dashboard');

  return (
    <div
      style={shellStyle}
      className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
    >
      <Watermark />

      <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        <div style={eyebrowStyle}>
          <Music className="h-4 w-4" />
          <span>{t('songOfTheWeek')}</span>
        </div>

        <h2 style={titleStyle}>{sotw.song.title}</h2>

        {sotw.song.author && (
          <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>
            {t('songByAuthor', { author: sotw.song.author })}
          </div>
        )}

        {sotw.teacher_message && <div style={quoteStyle}>&ldquo;{sotw.teacher_message}&rdquo;</div>}
      </div>

      <div
        style={{ position: 'relative', zIndex: 1, minWidth: 200 }}
        className="flex shrink-0 flex-col gap-3"
      >
        <Link href={`/dashboard/songs/${sotw.song_id}`} style={ctaStyle}>
          {t('viewSong')}
          <ArrowRight className="h-4 w-4" />
        </Link>

        {studentId && <AddSotwToRepertoireButton />}
      </div>
    </div>
  );
}
