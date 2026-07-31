'use client';

import { useState, useTransition } from 'react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';

import {
  addSongToMyRepertoireAction,
  removeSongFromMyRepertoireAction,
} from '@/app/actions/repertoire';

export type WantToLearnState =
  /** Not in the viewer's repertoire — offer to add. */
  | { kind: 'absent' }
  /** In the repertoire and the viewer may undo their own untouched pick. */
  | { kind: 'added-removable' }
  /** In the repertoire but locked: teacher-assigned, started, or practised. */
  | { kind: 'added-locked' };

type Props = {
  songId: string;
  initial: WantToLearnState;
  /** `compact` is the library-row variant; `full` is the song-page card. */
  variant?: 'full' | 'compact';
};

const baseStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  background: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const fullStyle: CSSProperties = {
  ...baseStyle,
  border: '1px solid var(--rule)',
  borderRadius: 999,
  padding: '7px 14px',
  color: 'var(--ink-2)',
};

const compactStyle: CSSProperties = {
  ...baseStyle,
  border: 'none',
  padding: '4px 2px',
  color: 'var(--ink-4)',
};

/**
 * Student control for marking a library song "want to learn".
 *
 * Adding creates a `to_learn` repertoire row via a SECURITY DEFINER RPC —
 * students hold no INSERT policy on the table. Removing is offered only while
 * the RPC would actually allow it (own pick, still `to_learn`, no practice);
 * `added-locked` renders as plain text instead of a button so the student is
 * never shown an action that would come back refused.
 */
export const WantToLearnButton = ({ songId, initial, variant = 'full' }: Props) => {
  const t = useTranslations('Songs');
  const [state, setState] = useState<WantToLearnState>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const style = variant === 'compact' ? compactStyle : fullStyle;

  const run = (fn: () => Promise<{ error: string } | object>, next: WantToLearnState) => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setState(next);
    });
  };

  if (state.kind === 'added-locked') {
    return (
      <span style={{ ...style, cursor: 'default', color: 'var(--success)' }}>
        {t('wantToLearnInRepertoire')}
      </span>
    );
  }

  const isAdded = state.kind === 'added-removable';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        disabled={isPending}
        aria-busy={isPending}
        onClick={() =>
          isAdded
            ? run(() => removeSongFromMyRepertoireAction(songId), { kind: 'absent' })
            : run(() => addSongToMyRepertoireAction(songId), { kind: 'added-removable' })
        }
        style={{
          ...style,
          color: error ? 'var(--danger)' : isAdded ? 'var(--success)' : style.color,
          opacity: isPending ? 0.55 : 1,
        }}
      >
        {isPending
          ? t('wantToLearnPending')
          : isAdded
            ? t('wantToLearnRemove')
            : t('wantToLearnAdd')}
      </button>
      {error && (
        <span role="status" style={{ ...baseStyle, cursor: 'default', color: 'var(--danger)' }}>
          {error}
        </span>
      )}
    </span>
  );
};
