import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { AssignmentListCounts } from '@/lib/services/assignment-list-params';

type Props = {
  asStudent: boolean;
  counts: AssignmentListCounts;
  canCreate?: boolean;
};

/** Picks the right overdue-nudge key for the reader's role and count — a
 * student reads it as their own catch-up list, a teacher reads it as a
 * prompt to nudge the student. Manual singular/plural (not ICU): the
 * next-intl/server Jest mock used in resolveServerTree doesn't parse ICU
 * plural blocks. */
const overdueBannerKey = (asStudent: boolean, count: number): string => {
  if (asStudent) return count === 1 ? 'listOverdueStudentSingular' : 'listOverdueStudentPlural';
  return count === 1 ? 'listOverdueTeacherSingular' : 'listOverdueTeacherPlural';
};

/** Page heading for /dashboard/assignments: role eyebrow, title, the overdue
 * nudge banner, and (teacher/admin only) the Templates / + New assignment
 * links. Split out of AssignmentsList to keep that file under the size limit. */
export const AssignmentsListHeader = async ({ asStudent, counts, canCreate }: Props) => {
  const t = await getTranslations('Assignments');

  return (
    <div className="ui-page-head" style={{ marginBottom: 20 }}>
      <div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.16em',
          }}
        >
          {asStudent ? t('listEyebrowStudent') : t('listEyebrowTeacher')}
        </div>
        <h1
          style={{
            margin: '4px 0 6px',
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 40,
            letterSpacing: '-0.02em',
            fontStyle: 'italic',
          }}
        >
          {t('listPageTitle')}
        </h1>
        {counts.overdue > 0 && (
          <div style={{ color: 'var(--danger)', fontSize: 13 }}>
            {/* "needs a nudge" is what a teacher does TO a student — reading it
                about your own homework is odd. Same count, each voice. */}
            {t(overdueBannerKey(asStudent, counts.overdue), { count: counts.overdue })}
          </div>
        )}
      </div>
      {canCreate && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/assignments/templates"
            className="ui-chip"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              color: 'var(--ink-4)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              padding: '8px 4px',
            }}
          >
            {t('listTemplatesLink')}
          </Link>
          <Link
            href="/dashboard/assignments/new"
            className="ui-chip"
            style={{
              border: '1px solid var(--rule)',
              borderRadius: 8,
              padding: '8px 16px',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              color: 'var(--ink-2)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {t('listNewAssignmentLink')}
          </Link>
        </div>
      )}
    </div>
  );
};
