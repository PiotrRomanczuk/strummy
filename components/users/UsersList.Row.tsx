import Link from 'next/link';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';
import { practiceTier } from '@/lib/services/student-health.helpers';
import type { StudentActivity } from '@/lib/services/user-activity-queries';
import type { UserListRow } from '@/lib/services/users-list-queries';

import { InlineInviteButton } from './InlineInviteButton';
import { ShadowBadge } from './ShadowBadge';
import { formatDate } from './student-detail.shared';

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** `Users.skillLevel*` per stored level; an unknown value shows as stored. */
const LEVEL_KEYS: Record<string, string> = {
  beginner: 'skillLevelBeginner',
  novice: 'skillLevelNovice',
  intermediate: 'skillLevelIntermediate',
  advanced: 'skillLevelAdvanced',
};

const HEALTH_DOT: Record<string, string> = {
  on_track: 'bg-[var(--success)]',
  watch: 'bg-[var(--warn)]',
  at_risk: 'bg-[var(--danger)]',
};

/**
 * The address to (re)invite this person at, or null if they need no invite.
 *
 * Anyone who has never signed in is still unclaimed, whether or not an invite
 * has already gone out. Keying this off `isShadow` alone meant the button
 * vanished the moment the first invite was sent -- and since invite links
 * expire, a student who missed the window had no way back in.
 *
 * Shadow rows carry a placeholder in `email`, so their real address lives in
 * `inviteEmail`; once invited, the address has moved to `email`.
 */
const inviteAddressFor = (r: UserListRow): string | null => {
  if (r.hasSignedIn || !r.isActive) return null;
  return (r.isShadow ? r.inviteEmail : r.email) || null;
};

/**
 * One person in the People list, Claude Design "Studio" roster style: their
 * own avatar colour, then — for a student — level, repertoire size and (when
 * practice tracking is on) how long since they practised, with a health dot.
 * The row used to be a gray initials disc, an e-mail and a join date, so the
 * list could not answer "who needs me this week".
 */
export const UsersListRow = ({
  r,
  activity,
  roles,
  canEdit,
  locale,
  t,
}: {
  r: UserListRow;
  activity?: StudentActivity;
  roles: string;
  canEdit: boolean;
  locale: string;
  t: Translate;
}) => {
  const levelKey = r.skillLevel ? LEVEL_KEYS[r.skillLevel.toLowerCase()] : null;
  const showPractice = SHOW_PRACTICE_FEATURES && r.isStudent && activity !== undefined;
  const studentMeta = r.isStudent
    ? [
        levelKey ? t(levelKey) : r.skillLevel,
        t('listSongCount', { count: activity?.songs ?? 0 }),
        showPractice
          ? activity?.daysSincePractice == null
            ? t('listNoPractice')
            : activity.daysSincePractice === 0
              ? t('listPracticedToday')
              : t('listPracticedDaysAgo', { days: activity.daysSincePractice })
          : null,
      ].filter(Boolean)
    : [];
  const invite = inviteAddressFor(r);

  return (
    <div className="ui-row grid grid-cols-1 items-center gap-x-3.5 gap-y-1.5 border-b border-[var(--rule)] px-5 py-3.5 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_150px_120px_90px]">
      <Link
        href={`/dashboard/users/${r.id}`}
        className={`flex min-w-0 items-center gap-3 text-inherit no-underline ${r.isActive ? '' : 'opacity-50'}`}
      >
        <StudentInitials name={r.fullName} email={r.email} color={r.avatarColor} size={34} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate text-[13px] font-medium">
            <span className="truncate">{r.fullName ?? r.email ?? t('listUnnamedFallback')}</span>
            {showPractice && (
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${HEALTH_DOT[practiceTier(activity?.daysSincePractice ?? null)]}`}
              />
            )}
            {r.isShadow && <ShadowBadge />}
          </div>
          <div className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--ink-4)]">
            {studentMeta.length > 0 ? studentMeta.join(' · ') : r.email}
          </div>
        </div>
      </Link>
      <span className="hidden font-[family-name:var(--mono)] text-[11px] uppercase tracking-[.08em] text-[var(--ink-3)] md:inline">
        {roles}
      </span>
      <span className="hidden font-[family-name:var(--mono)] text-[11px] text-[var(--ink-4)] md:inline">
        {r.isActive ? formatDate(r.createdAt, locale) : t('listDeactivatedLabel')}
      </span>
      {/* Phones: under the name (it took half the row and truncated it). */}
      <span className="pl-[46px] text-left md:pl-0 md:text-right">
        {invite ? (
          <InlineInviteButton userId={r.id} inviteEmail={invite} isResend={!r.isShadow} />
        ) : (
          canEdit && (
            <Link
              href={`/dashboard/users/${r.id}/edit`}
              className="font-[family-name:var(--mono)] text-[11px] uppercase tracking-[.08em] text-[var(--gold-2)] no-underline"
            >
              {t('listEditLink')}
            </Link>
          )
        )}
      </span>
    </div>
  );
};
