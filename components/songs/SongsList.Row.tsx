import Link from 'next/link';
import type { CSSProperties } from 'react';

import type { Song } from '@/components/songs/types';

import { levelLabel } from './song-format.helpers';

export const COLUMNS_CLASS = 'grid grid-cols-1 md:grid-cols-[1fr_200px_100px_90px]';
export const COLUMNS_WITH_ACTION_CLASS =
  'grid grid-cols-1 md:grid-cols-[1fr_200px_100px_90px_auto]';

/**
 * Cells sit above a stretched link and ignore pointer events, so the whole row
 * still navigates while the action cell stays clickable. The row cannot simply
 * wrap everything in a <Link> any more — a <button> inside an <a> is invalid
 * HTML and would navigate on every click.
 */
const cellOverlay: CSSProperties = { position: 'relative', pointerEvents: 'none' };

const truncate: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const rowStyle: CSSProperties = {
  position: 'relative',
  gap: 14,
  padding: '14px 20px',
  borderBottom: '1px solid var(--rule)',
  color: 'inherit',
  alignItems: 'center',
};

const stretchedLinkStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  textDecoration: 'none',
};

const titleStyle: CSSProperties = {
  ...cellOverlay,
  ...truncate,
  fontFamily: 'var(--serif)',
  fontStyle: 'italic',
  fontSize: 15,
  color: 'var(--ink)',
};

const mobileMetaStyle: CSSProperties = {
  ...cellOverlay,
  fontSize: 12,
  color: 'var(--ink-3)',
  marginTop: -8,
};

const authorStyle: CSSProperties = {
  ...cellOverlay,
  ...truncate,
  fontSize: 13,
  color: 'var(--ink-2)',
};

const levelStyle: CSSProperties = {
  ...cellOverlay,
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: 'var(--ink-3)',
};

const keyStyle: CSSProperties = {
  ...cellOverlay,
  textAlign: 'right',
  fontFamily: 'var(--mono)',
  fontSize: 12,
  color: 'var(--ink-3)',
};

export const SongRow = ({
  song,
  t,
  untitledFallback,
  action,
}: {
  song: Song;
  t: (key: string) => string;
  untitledFallback: string;
  /** Student-only "want to learn" control; absent for every other viewer. */
  action?: React.ReactNode;
}) => {
  const title = song.title || untitledFallback;
  const mobileMeta = [song.author, song.level ? levelLabel(song.level, t) : null, song.key]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`ui-row ${action ? COLUMNS_WITH_ACTION_CLASS : COLUMNS_CLASS}`}
      style={rowStyle}
    >
      <Link href={`/dashboard/songs/${song.id}`} aria-label={title} style={stretchedLinkStyle} />
      <div style={titleStyle}>{title}</div>
      {/* Mobile: one labelled meta line instead of a stack of bare cells. */}
      {mobileMeta && (
        <div className="md:hidden" style={mobileMetaStyle}>
          {mobileMeta}
        </div>
      )}
      <div className="hidden md:block" style={authorStyle}>
        {song.author || '—'}
      </div>
      <div className="hidden md:block" style={levelStyle}>
        {song.level ? levelLabel(song.level, t) : '—'}
      </div>
      <div className="hidden md:block" style={keyStyle}>
        {song.key || '—'}
      </div>
      {action && (
        <div style={{ position: 'relative', textAlign: 'right' }} data-testid="song-row-action">
          {action}
        </div>
      )}
    </div>
  );
};
