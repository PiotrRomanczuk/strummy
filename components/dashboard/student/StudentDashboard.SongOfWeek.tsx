import Link from 'next/link';
import { Music } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getCurrentSongOfTheWeek } from '@/app/actions/song-of-the-week';

import { AddSotwToRepertoireButton } from '../AddSotwToRepertoireButton';
import { eyebrow, HomeCard } from './StudentHomePrimitives';

/**
 * Song of the week, as a side card. The Claude Design dashboard has no slot
 * for it, but it is the teacher's weekly pick — so it sits under Achievements
 * in the same card chrome rather than as a banner above the hero.
 */
export async function StudentSongOfWeekCard() {
  const sotw = await getCurrentSongOfTheWeek();
  if (!sotw) return null;
  const t = await getTranslations('Dashboard');

  return (
    <HomeCard>
      <div
        style={{
          ...eyebrow,
          color: 'var(--gold-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Music size={12} aria-hidden="true" /> {t('songOfTheWeek')}
      </div>
      <Link
        href={`/dashboard/songs/${sotw.song_id}`}
        style={{ display: 'block', marginTop: 6, color: 'inherit', textDecoration: 'none' }}
      >
        <div
          style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 500 }}
        >
          {sotw.song.title}
        </div>
        {sotw.song.author && (
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>
            {sotw.song.author}
          </div>
        )}
      </Link>
      {sotw.teacher_message && (
        <div
          style={{
            marginTop: 10,
            paddingLeft: 12,
            borderLeft: '2px solid var(--gold-dim)',
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--ink-2)',
          }}
        >
          &ldquo;{sotw.teacher_message}&rdquo;
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <AddSotwToRepertoireButton />
      </div>
    </HomeCard>
  );
}
