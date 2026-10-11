import type { ReactNode } from 'react';

import { songStatusColour } from '@/lib/services/lessons-queries';

const ellipsis = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

/** "#40  Barre chord intro" over the first line of the lesson notes. */
export const LessonRowTitle = ({
  number,
  title,
  notes,
  t,
}: {
  number: number;
  title: string | null;
  notes: string | null;
  t: (key: string) => string;
}) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          padding: '2px 6px',
          background: 'var(--rule-2)',
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        #{number}
      </span>
      <span
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 15,
          fontWeight: 500,
          fontStyle: title ? 'normal' : 'italic',
          color: title ? 'var(--ink)' : 'var(--ink-4)',
          ...ellipsis,
        }}
      >
        {title ?? t('untitledLesson')}
      </span>
    </div>
    {notes && (
      <div
        className="ui-datalist-desktop"
        style={{ color: 'var(--ink-4)', fontSize: 12, marginTop: 4, ...ellipsis }}
      >
        {notes.split('\n')[0]}
      </div>
    )}
  </div>
);

/** Avatar + name, with an optional mono sub-line (the student's level). */
export const PersonCell = ({
  avatar,
  name,
  sub,
}: {
  avatar: ReactNode;
  name: string;
  sub?: string | null;
}) => (
  <div className="ui-datalist-desktop" style={{ minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      {avatar}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, ...ellipsis }}>{name}</div>
        {sub && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-4)',
              fontFamily: 'var(--mono)',
              textTransform: 'capitalize',
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  </div>
);

/** "2 songs ••" — count plus one progress dot per song (first four). */
export const LessonRowSongs = ({
  count,
  statuses,
  t,
}: {
  count: number;
  statuses: string[];
  t: (key: string) => string;
}) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{count}</span>
    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
      {count === 1 ? t('song') : t('songs')}
    </span>
    {count > 0 && (
      <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }} aria-hidden="true">
        {statuses.slice(0, 4).map((status, i) => (
          <span
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: songStatusColour(status),
            }}
          />
        ))}
      </span>
    )}
  </span>
);
