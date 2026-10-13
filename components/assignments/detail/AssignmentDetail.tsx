import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import type {
  // Aliased: the query-layer row type and this component now share the plain
  // name, and the component owns the file.
  AssignmentDetail as AssignmentDetailRow,
  AssignmentHistoryEntry,
} from '@/lib/services/assignment-detail-queries';
import { deriveEffectiveStatus } from '@/lib/services/assignment-list-params';
import { assignmentStatusColour, assignmentStatusLabel } from '@/lib/services/assignments-queries';
import { AssignmentSubmitPanel } from './AssignmentDetail.SubmitPanel';
import { SaveAsTemplateButton } from './SaveAsTemplateButton';
import { RevisionHistoryModal } from '@/components/history/RevisionHistoryModal';

/** `Assignments.*` key per submission type — the create form already uses these. */
const SUBMISSION_TYPE_KEYS: Record<string, string> = {
  self_report: 'submissionTypeSelfReport',
  audio: 'submissionTypeAudioRecording',
  video: 'submissionTypeVideo',
  note: 'submissionTypeNote',
};

/** "Friday, October 16, 2026" / "piątek, 16 października 2026". */
const formatDate = (iso: string | null, locale: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale.startsWith('en') ? 'en-US' : locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 10,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        padding: '16px 22px 12px',
        borderBottom: '1px solid var(--rule)',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: 'var(--gold-2)',
      }}
    >
      {title}
    </div>
    <div style={{ padding: '18px 22px 22px' }}>{children}</div>
  </div>
);

type Props = {
  assignment: AssignmentDetailRow;
  canManage: boolean; // teacher/admin
  canAct: boolean; // owning student or manager — may change status
  history: AssignmentHistoryEntry[]; // ASG-2 — teacher/admin view only for now
};

export const AssignmentDetail = async ({ assignment, canManage, canAct, history }: Props) => {
  const [t, locale] = await Promise.all([getTranslations('Assignments'), getLocale()]);
  // Same read-time derivation as the list: a past-due open assignment shows
  // OVERDUE here too, not its raw persisted status.
  const effectiveStatus = deriveEffectiveStatus(assignment.dueDate, assignment.status);
  const colour = assignmentStatusColour(effectiveStatus);
  const isOverdue = effectiveStatus === 'overdue';
  const isStudentView = canAct && !canManage;
  const studentDisplay =
    assignment.studentName ?? assignment.studentEmail ?? t('detailStudentFallback');

  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '28px 32px 64px',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <Link
          href="/dashboard/assignments"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '.14em',
          }}
        >
          {t('detailBackLink')}
        </Link>

        <div style={{ marginTop: 14, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 4,
                background: 'rgba(0,0,0,.03)',
                color: colour,
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                fontFamily: 'var(--mono)',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: colour }} />
              {assignmentStatusLabel(effectiveStatus, t)}
            </span>
            {canManage && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
                {history && history.length > 0 && (
                  <RevisionHistoryModal
                    history={history}
                    triggerButton={
                      <button
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 11,
                          color: 'var(--ink-3)',
                          textTransform: 'uppercase',
                          letterSpacing: '.1em',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {t('detailViewHistory')}
                      </button>
                    }
                  />
                )}
                <SaveAsTemplateButton assignmentId={assignment.id} />
                <Link
                  href={`/dashboard/assignments/${assignment.id}/edit`}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '.1em',
                  }}
                >
                  {t('detailEditLink')}
                </Link>
              </div>
            )}
          </div>
          <h1
            style={{
              margin: '10px 0 8px',
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 40,
              letterSpacing: '-0.02em',
              fontStyle: 'italic',
            }}
          >
            {assignment.title}
          </h1>
          <div style={{ color: 'var(--ink-3)' }}>
            {/* A student reading "for Emma Wright" about their own homework is
                addressing themselves in the third person — drop the attribution
                for them and lead with the due date instead. */}
            {!isStudentView && (
              <>
                {t('detailForPrefix')}{' '}
                <Link
                  href={`/dashboard/users/${assignment.studentId}`}
                  style={{ color: 'var(--ink-2)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {studentDisplay}
                </Link>{' '}
                ·{' '}
              </>
            )}
            <span style={isOverdue ? { color: 'var(--danger)', fontWeight: 500 } : undefined}>
              {t('detailDueLabel')} {formatDate(assignment.dueDate, locale)}
            </span>
          </div>
        </div>

        <div className="grid gap-5 grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card title={t('createFormBriefLabel')}>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 14,
                lineHeight: 1.65,
                color: 'var(--ink-2)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {assignment.description ?? (
                <span style={{ fontStyle: 'italic', color: 'var(--ink-4)' }}>
                  {t('detailNoDescription')}
                </span>
              )}
            </div>
            {assignment.song && (
              <div style={{ marginTop: 16, fontSize: 13 }}>
                <span style={{ color: 'var(--ink-4)' }}>{t('detailSongPrefix')} </span>
                <Link
                  href={`/dashboard/songs/${assignment.song.id}`}
                  style={{ color: 'var(--ink-2)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {assignment.song.title}
                  {assignment.song.author ? ` — ${assignment.song.author}` : ''}
                </Link>
              </div>
            )}
            {assignment.lesson && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--ink-4)' }}>{t('detailLessonPrefix')} </span>
                <Link
                  href={`/dashboard/lessons/${assignment.lesson.id}`}
                  style={{ color: 'var(--ink-2)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {formatDate(assignment.lesson.scheduledAt, locale)}
                </Link>
              </div>
            )}
            {assignment.dailyTargetMinutes != null && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--ink-4)' }}>{t('detailTargetPrefix')} </span>
                <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>
                  {t('createFormMinPerDay', { minutes: assignment.dailyTargetMinutes })}
                </span>
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--ink-4)' }}>{t('detailSubmitAsPrefix')} </span>
              <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>
                {t(SUBMISSION_TYPE_KEYS[assignment.submissionType] ?? 'submissionTypeSelfReport')}
              </span>
            </div>
          </Card>

          <Card
            title={isStudentView ? t('detailYourPracticeCardTitle') : t('detailProgressCardTitle')}
          >
            <AssignmentSubmitPanel
              assignment={assignment}
              canManage={canManage}
              canAct={canAct}
              effectiveStatus={effectiveStatus}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};
