import type { DayLesson } from '@/lib/services/teacher-dashboard-queries';

/**
 * The two song chips a day-spine block can carry. Extracted so the block
 * itself stays under the function-length limit; it is never rendered alone.
 * The block clips its overflow, so on a narrow phone these fall outside the
 * card's height and simply do not show — the name and start time win the room.
 */
export const TeacherDaySpineLessonSongs = ({ songs }: { songs: DayLesson['songs'] }) => {
  if (songs.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {songs.slice(0, 2).map((sg) => (
        <span
          key={sg.songId}
          style={{
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(0,0,0,.04)',
            fontStyle: 'italic',
            fontFamily: 'var(--serif)',
          }}
        >
          {sg.songKey && (
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontStyle: 'normal',
                color: 'var(--gold-2)',
                marginRight: 4,
              }}
            >
              {sg.songKey}
            </span>
          )}
          {sg.title}
        </span>
      ))}
    </div>
  );
};
