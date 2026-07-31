'use client';

import { useState, useTransition } from 'react';
import type { ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { STAGES, STAGE_COLOR, stageLabelKey, type StageKey } from '@/components/songs/SongPrimitives';
import type { StudentRepertoireRow } from '@/lib/services/student-detail-queries';
import { updateRepertoireEntryAction } from '@/app/actions/repertoire';
import { Empty, formatMinutes } from './student-detail.shared';

const ROW_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 150px 90px',
  gap: 12,
  alignItems: 'center',
};

const TitleBlock = ({ row }: { row: StudentRepertoireRow }) => (
  <Link
    href={`/dashboard/songs/${row.songId}`}
    style={{ minWidth: 0, textDecoration: 'none', color: 'inherit' }}
  >
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
      {row.songTitle}
    </div>
    {row.songAuthor && (
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
        {row.songAuthor}
      </div>
    )}
  </Link>
);

const ReadOnlyRow = ({ row, isLast }: { row: StudentRepertoireRow; isLast: boolean }) => {
  const t = useTranslations('Songs');
  const statusKey = STAGES.some((s) => s.key === row.status)
    ? stageLabelKey(row.status as StageKey)
    : null;
  return (
    <div
      style={{
        ...ROW_GRID,
        padding: '12px 22px',
        borderBottom: isLast ? 'none' : '1px solid var(--rule)',
      }}
    >
      <TitleBlock row={row} />
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: STAGE_COLOR[row.status as StageKey] ?? 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {statusKey ? t(statusKey) : row.status}
      </span>
      <span
        style={{
          textAlign: 'right',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
        }}
      >
        {formatMinutes(row.totalPracticeMinutes)}
      </span>
    </div>
  );
};

const EditableRow = ({ row, isLast }: { row: StudentRepertoireRow; isLast: boolean }) => {
  const t = useTranslations('Songs');
  const router = useRouter();
  const [status, setStatus] = useState(row.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newStatus = event.target.value;
    const previousStatus = status;
    setStatus(newStatus);
    setError(null);

    startTransition(async () => {
      const result = await updateRepertoireEntryAction(row.id, { current_status: newStatus });
      if ('error' in result) {
        setStatus(previousStatus);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div
      style={{
        padding: '12px 22px',
        borderBottom: isLast ? 'none' : '1px solid var(--rule)',
      }}
    >
      <div style={ROW_GRID}>
        <TitleBlock row={row} />
        <select
          aria-label={t('statusForSong', { title: row.songTitle })}
          value={status}
          onChange={handleChange}
          disabled={isPending}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: STAGE_COLOR[status as StageKey] ?? 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            background: 'var(--card)',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            padding: '4px 6px',
            cursor: isPending ? 'wait' : 'pointer',
          }}
        >
          {STAGES.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {t(stageLabelKey(stage.key))}
            </option>
          ))}
        </select>
        <span
          style={{
            textAlign: 'right',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
          }}
        >
          {formatMinutes(row.totalPracticeMinutes)}
        </span>
      </div>
      {error && (
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--danger, #b3452e)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

type Props = {
  repertoire: StudentRepertoireRow[];
  /** True when the viewer is staff (admin/teacher); enables the status select. */
  canEdit: boolean;
};

const COLLAPSED_COUNT = 12;

export const StudentDetailRepertoire = ({ repertoire, canEdit }: Props) => {
  const t = useTranslations('Songs');
  const [isExpanded, setIsExpanded] = useState(false);

  if (repertoire.length === 0) {
    return <Empty>{t('noSongsAssigned')}</Empty>;
  }

  const visible = isExpanded ? repertoire : repertoire.slice(0, COLLAPSED_COUNT);
  const hasMore = repertoire.length > COLLAPSED_COUNT;
  const Row = canEdit ? EditableRow : ReadOnlyRow;

  return (
    <div>
      {visible.map((row, i) => (
        <Row key={row.songId} row={row} isLast={!hasMore && i === visible.length - 1} />
      ))}
      {hasMore && (
        <div style={{ padding: '12px 22px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--gold-2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isExpanded ? t('showFewer') : t('showAllSongs', { count: repertoire.length })}
          </button>
        </div>
      )}
    </div>
  );
};
