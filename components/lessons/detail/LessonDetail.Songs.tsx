import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { LessonDetail, SongHistoryEntry } from '@/lib/services/lesson-detail-queries';
import type { SongOption } from '@/lib/services/lesson-form-data';

import { LessonAddSong } from './LessonDetail.AddSong';
import { LessonSongAssign } from './LessonDetail.SongAssign';
import { LessonSongNotes } from './LessonDetail.SongNotes';
import { LessonSongStepper } from './LessonDetail.SongStepper';
import { Card, CardHeader } from './LessonDetailPrimitives';

type SongRow = LessonDetail['songs'][number];

const SongEntry = ({
  song,
  lesson,
  canEdit,
  isFirst,
  history,
}: {
  song: SongRow;
  lesson: LessonDetail;
  canEdit: boolean;
  isFirst: boolean;
  history: SongHistoryEntry[];
}) => {
  const meta = [song.author, song.releaseYear, song.key ? `Key ${song.key}` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <div
      style={{
        borderTop: isFirst ? '1px solid var(--rule)' : 'none',
        borderBottom: '1px solid var(--rule)',
        padding: '16px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: 6,
            flex: '0 0 42px',
            background: 'linear-gradient(135deg, var(--gold-dim), var(--gold-2))',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--serif)',
            fontSize: 14,
            fontWeight: 500,
            color: '#fff',
            boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.2)',
          }}
        >
          {song.key ?? '·'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/dashboard/songs/${song.songId}`}
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 17,
              fontWeight: 500,
              fontStyle: 'italic',
              letterSpacing: '-0.01em',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            {song.title}
          </Link>
          {meta && (
            <div
              style={{
                color: 'var(--ink-4)',
                fontSize: 12,
                fontFamily: 'var(--mono)',
                marginTop: 2,
              }}
            >
              {meta}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <LessonSongStepper
              lessonId={lesson.id}
              songId={song.songId}
              initialStatus={song.status}
              readOnly={!canEdit}
            />
          </div>
          <LessonSongNotes
            lessonId={lesson.id}
            songId={song.songId}
            initialNote={song.notes}
            history={history}
            canEdit={canEdit}
          />
        </div>
        {canEdit && (
          <LessonSongAssign
            lessonId={lesson.id}
            songId={song.songId}
            songTitle={song.title}
            studentId={lesson.studentId}
          />
        )}
      </div>
    </div>
  );
};

/** Claude Design "Repertoire / Songs · N" card. */
export const LessonSongsCard = async ({
  lesson,
  canEdit,
  songHistory,
  library,
}: {
  lesson: LessonDetail;
  canEdit: boolean;
  songHistory: Record<string, SongHistoryEntry[]>;
  library: SongOption[];
}) => {
  const t = await getTranslations('Lessons');
  return (
    <Card>
      <CardHeader
        eyebrow={t('repertoireEyebrow')}
        title={
          <>
            {t('songsTitle')}{' '}
            <span style={{ color: 'var(--ink-4)', fontSize: 14, fontWeight: 400 }}>
              · {lesson.songs.length}
            </span>
          </>
        }
        action={
          canEdit ? (
            <LessonAddSong
              lessonId={lesson.id}
              currentIds={lesson.songs.map((s) => s.songId)}
              library={library}
            />
          ) : undefined
        }
      />
      <div style={{ padding: '4px 24px 20px' }}>
        {lesson.songs.length === 0 && (
          <div
            style={{
              padding: '28px 0',
              textAlign: 'center',
              color: 'var(--ink-4)',
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
              fontSize: 16,
            }}
          >
            {t('noSongsAttached')}
          </div>
        )}
        {lesson.songs.map((song, i) => (
          <SongEntry
            key={song.songId}
            song={song}
            lesson={lesson}
            canEdit={canEdit}
            isFirst={i === 0}
            history={songHistory[song.songId] ?? []}
          />
        ))}
      </div>
    </Card>
  );
};
