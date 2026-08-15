'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { VALID_STATUS_TRANSITIONS, type AssignmentStatus } from '@/schemas/AssignmentSchema';
import { updateAssignmentStatusAction } from '@/app/actions/assignment-status';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Translation-key lookup for the target-status action verb — not the label
// itself, so it renders in the active locale via the caller's own `t`.
const LABEL_KEYS: Record<string, string> = {
  in_progress: 'statusActionsStartWorking',
  completed: 'statusActionsMarkComplete',
  cancelled: 'statusActionsCancelAssignment',
};

// Students may only advance to these states; teachers/admin get the full set.
const STUDENT_TARGETS: AssignmentStatus[] = ['in_progress', 'completed'];

type Props = {
  assignmentId: string;
  currentStatus: AssignmentStatus;
  canManage: boolean; // teacher or admin
};

export const AssignmentStatusActions = ({ assignmentId, currentStatus, canManage }: Props) => {
  const router = useRouter();
  const t = useTranslations('Assignments');
  const [busy, setBusy] = useState<AssignmentStatus | null>(null);
  const [error, setError] = useState('');

  const transitions = (VALID_STATUS_TRANSITIONS[currentStatus] ?? []) as AssignmentStatus[];
  const targets = canManage
    ? transitions
    : transitions.filter((status) => STUDENT_TARGETS.includes(status));

  const onClick = useCallback(
    async (next: AssignmentStatus) => {
      if (busy) return;
      setBusy(next);
      setError('');
      const result = await updateAssignmentStatusAction(assignmentId, next);
      setBusy(null);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    },
    [assignmentId, busy, router]
  );

  if (targets.length === 0) {
    return (
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.1em',
        }}
      >
        {t('statusActionsNoFurtherActions')}
      </div>
    );
  }

  // Exactly one primary action: the natural next step. Everything else is
  // secondary so the choice reads at a glance.
  const primaryTarget: AssignmentStatus | null = targets.includes('in_progress')
    ? 'in_progress'
    : targets.includes('completed')
      ? 'completed'
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {targets.map((next) => {
          const isPrimary = next === primaryTarget;
          const buttonEl = (
            <button
              type="button"
              disabled={busy !== null}
              onClick={next !== 'cancelled' ? () => onClick(next) : undefined}
              style={{
                border: isPrimary ? 'none' : '1px solid var(--rule)',
                background: isPrimary ? 'var(--ink)' : 'transparent',
                color: isPrimary ? 'var(--ivory)' : 'var(--ink-3)',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 500,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'var(--mono)',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                opacity: busy && busy !== next ? 0.5 : 1,
              }}
            >
              {busy === next
                ? t('createFormSavingButton')
                : LABEL_KEYS[next]
                  ? t(LABEL_KEYS[next])
                  : next}
            </button>
          );

          if (next === 'cancelled') {
            return (
              <AlertDialog key={next}>
                <AlertDialogTrigger asChild>{buttonEl}</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('statusActionsCancelDialogTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('statusActionsCancelDialogDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('templateEditKeepButton')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onClick('cancelled')}>
                      {t('statusActionsConfirmCancelButton')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            );
          }

          return <span key={next}>{buttonEl}</span>;
        })}
      </div>
      {error && (
        <span style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--mono)' }}>
          {error}
        </span>
      )}
    </div>
  );
};
