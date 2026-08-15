'use client';

import { useCallback, useState, useTransition } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';

import { updateRepertoireEntryAction } from '@/app/actions/repertoire';
import { stageLabelKey, STAGE_LABEL_KEYS, type StageKey } from '@/components/songs/SongPrimitives';
import { DataListCell, DataListRow, DataListTitle } from '@/components/shared/DataList';

import { RepertoireRowEditor } from './RepertoireRow.Editor';
import type { StudentRepertoireWithSong } from '@/types/StudentRepertoire';

/** Explicit locale: a bare toLocaleDateString() follows the runtime's own, so
 *  the server rendered "14.07.2026" and the browser "14/07/2026" — a hydration
 *  mismatch on every row. Do not remove the locale argument. */
const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const titleLinkStyle: CSSProperties = { color: 'inherit', textDecoration: 'none' };

const toggleStyle = (hasNote: boolean): CSSProperties => ({
  justifySelf: 'end',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  border: 'none',
  background: 'none',
  color: hasNote ? 'var(--gold-2)' : 'var(--ink-4)',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  cursor: 'pointer',
});

const chevronStyle = (isOpen: boolean): CSSProperties => ({
  transform: isOpen ? 'rotate(180deg)' : undefined,
  transition: 'transform .15s',
});

const isStageKey = (status: string): status is StageKey =>
  Object.prototype.hasOwnProperty.call(STAGE_LABEL_KEYS, status);

type Props = {
  entry: StudentRepertoireWithSong;
  /** Students may edit notes + difficulty inline; otherwise read-only. */
  canEdit: boolean;
  template: string;
};

/**
 * One repertoire row: compact by default, expanding to the notes + difficulty
 * editor on demand.
 *
 * The editor used to be mounted open on every row, so a 31-song repertoire
 * rendered 31 textareas, 155 difficulty buttons and 31 hydrated client
 * components — unreadable, and the page's whole cost paid up front. Only the
 * opened row now mounts its editor.
 */
export const RepertoireRow = ({ entry, canEdit, template }: Props) => {
  const t = useTranslations('Repertoire');
  const tSongs = useTranslations('Songs');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(entry.student_notes ?? '');
  const [difficulty, setDifficulty] = useState<number | ''>(entry.difficulty_rating ?? '');
  const [isPending, startTransition] = useTransition();

  const statusLabel = isStageKey(entry.current_status)
    ? tSongs(stageLabelKey(entry.current_status))
    : entry.current_status;

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const result = await updateRepertoireEntryAction(entry.id, {
        student_notes: notes.trim() || null,
        difficulty_rating: difficulty === '' ? null : Number(difficulty),
      });
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t('savedToast'));
      setIsOpen(false);
      router.refresh();
    });
  }, [entry.id, notes, difficulty, router, t]);

  /** Surfaces a saved note on the collapsed row, so it is not invisible. */
  const hasNote = Boolean(entry.student_notes?.trim());

  return (
    <DataListRow
      template={template}
      mobileMeta={[
        entry.song.author,
        statusLabel,
        entry.last_practiced_at ? formatDate(entry.last_practiced_at) : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      detail={
        isOpen && canEdit ? (
          <RepertoireRowEditor
            entryId={entry.id}
            notes={notes}
            onNotesChange={setNotes}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            onSave={handleSave}
            isPending={isPending}
          />
        ) : null
      }
    >
      <DataListTitle>
        <Link href={`/dashboard/songs/${entry.song.id}`} style={titleLinkStyle}>
          {entry.song.title}
        </Link>
      </DataListTitle>

      <DataListCell>{entry.song.author || '—'}</DataListCell>

      <DataListCell mono>{statusLabel}</DataListCell>

      <DataListCell mono align="right">
        {entry.last_practiced_at ? formatDate(entry.last_practiced_at) : '—'}
      </DataListCell>

      {canEdit ? (
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-label={t('toggleDetailsAriaLabel', { title: entry.song.title })}
          style={toggleStyle(hasNote)}
        >
          {hasNote ? t('hasNoteLabel') : t('notesLabel')}
          <ChevronDown className="h-3.5 w-3.5" style={chevronStyle(isOpen)} />
        </button>
      ) : (
        <span />
      )}
    </DataListRow>
  );
};
