'use client';

import { useTranslations } from 'next-intl';

import { FormAvatar } from '@/components/shared/FormAvatar';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';

type Props = {
  student?: StudentOption;
  studentEmail: string;
  scheduledLocal: string;
  durationMinutes: number;
  songs: SongOption[];
  songIds: string[];
};

const formatScheduled = (local: string, fallback: string): string => {
  if (!local) return fallback;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/** Live-preview sidebar content for the lesson form — mirrors the mockup's
 * "who / when / songs" summary card. */
export const LessonFormPreview = ({
  student,
  studentEmail,
  scheduledLocal,
  durationMinutes,
  songs,
  songIds,
}: Props) => {
  const t = useTranslations('Lessons');
  const name = student?.name ?? (studentEmail || t('previewNewLesson'));
  const selectedSongs = songIds
    .map((id) => songs.find((song) => song.id === id))
    .filter((song): song is SongOption => Boolean(song));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <FormAvatar name={student?.name ?? null} email={student?.email ?? studentEmail} size={36} />
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            {formatScheduled(scheduledLocal, t('pickDateTime'))} · {durationMinutes} min
          </div>
        </div>
      </div>
      <div style={{ paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '.12em',
            color: 'var(--ink-4)',
            fontFamily: 'var(--mono)',
            marginBottom: 8,
          }}
        >
          {t('previewSongsCount', { count: selectedSongs.length })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selectedSongs.map((song) => (
            <div
              key={song.id}
              style={{ fontSize: 12, fontFamily: 'var(--serif)', fontStyle: 'italic' }}
            >
              {song.title}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
