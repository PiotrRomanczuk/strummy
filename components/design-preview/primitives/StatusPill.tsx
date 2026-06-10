import type { SongStatusKey } from '../lib/types';

type StatusMeta = { label: string; dots: number; color: string };

export const SONG_STATUS: Record<SongStatusKey, StatusMeta> = {
  to_learn: { label: 'To learn', dots: 1, color: 'var(--ink-4)' },
  started: { label: 'Started', dots: 2, color: 'var(--info)' },
  remembered: { label: 'Remembered', dots: 3, color: 'var(--warn)' },
  with_author: { label: 'With author', dots: 4, color: '#7a6aa0' },
  mastered: { label: 'Mastered', dots: 5, color: 'var(--success)' },
};

export const StatusPill = ({
  status,
  compact = false,
}: {
  status: SongStatusKey;
  compact?: boolean;
}) => {
  const s = SONG_STATUS[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '2px 8px' : '3px 10px',
        borderRadius: 999,
        background: `${s.color}15`,
        color: s.color,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '.01em',
      }}
    >
      <span style={{ display: 'inline-flex', gap: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: i < s.dots ? s.color : `${s.color}40`,
            }}
          />
        ))}
      </span>
      {s.label}
    </span>
  );
};
