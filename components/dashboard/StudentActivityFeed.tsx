import type { StudentActivityRow } from '@/lib/services/student-dashboard-queries';

const STATUS_LABEL: Record<string, string> = {
  to_learn: 'To learn',
  started: 'Started',
  remembered: 'Remembered',
  with_author: 'Play-along',
  mastered: 'Mastered',
};

const formatTime = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export function StudentActivityFeed({ activities }: { activities: StudentActivityRow[] }) {
  return (
    <div>
      {activities.map((a, i) => (
        <div
          key={a.id}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 12,
            padding: '12px 24px',
            borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
            borderBottom: '1px solid var(--rule)',
            alignItems: 'center',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.songTitle}
            </div>
            {a.songAuthor && (
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink-4)',
                  marginTop: 2,
                }}
              >
                {a.songAuthor}
              </div>
            )}
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: 'var(--ink-2)',
              }}
            >
              Changed to <strong style={{ fontWeight: 500 }}>{STATUS_LABEL[a.newStatus] ?? a.newStatus}</strong>
              {a.previousStatus ? ` (from ${STATUS_LABEL[a.previousStatus] ?? a.previousStatus})` : ''}
            </div>
          </div>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-4)',
              textAlign: 'right',
            }}
          >
            {formatTime(a.changedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
