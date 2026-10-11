import Link from 'next/link';
import { Calendar, Download, Mail } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { StudentProfile } from '@/lib/services/student-detail-queries';

import { DeleteShadowButton } from './DeleteShadowButton';
import { InlineInviteButton } from './InlineInviteButton';
import { InviteShadowButton } from './InviteShadowButton';

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '9px 16px',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'var(--sans)',
  borderRadius: 8,
  border: '1px solid transparent',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  textDecoration: 'none',
};
const outline: React.CSSProperties = {
  ...btn,
  background: 'var(--card)',
  color: 'var(--ink-2)',
  borderColor: 'var(--rule)',
};

/**
 * Claude Design header buttons — "Message" (outline) and "Schedule lesson"
 * (dark, or red when the student is at risk) — plus the account actions the
 * app needs (invite, import songs, remove a shadow profile) as quiet links.
 */
export const HeaderActions = async ({
  profile,
  isAtRisk,
}: {
  profile: StudentProfile;
  isAtRisk: boolean;
}) => {
  const t = await getTranslations('Users');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {profile.email && (
          <a href={`mailto:${profile.email}`} style={outline}>
            <Mail size={17} strokeWidth={2} aria-hidden="true" /> {t('detailMessageLabel')}
          </a>
        )}
        {/* Carry the student through so the teacher isn't asked to re-pick the
            person whose page they're already on (LES-5). */}
        <Link
          href={`/dashboard/lessons/new?studentId=${encodeURIComponent(profile.id)}`}
          style={{
            ...btn,
            background: isAtRisk ? 'var(--danger)' : 'var(--ink)',
            color: isAtRisk ? '#fff' : 'var(--paper)',
          }}
        >
          <Calendar size={17} strokeWidth={2} aria-hidden="true" /> {t('detailScheduleLessonLink')}
        </Link>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          fontSize: 12,
        }}
      >
        {profile.isShadow ? (
          <InviteShadowButton userId={profile.id} defaultEmail={profile.inviteEmail} />
        ) : (
          // Already invited but never signed in: re-send. Invite links expire,
          // and without this a student who missed the window had no route back.
          !profile.hasSignedIn &&
          profile.email && (
            <InlineInviteButton userId={profile.id} inviteEmail={profile.email} isResend />
          )
        )}
        <Link
          href={`/dashboard/users/${profile.id}/import`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--ink-3)',
            textDecoration: 'none',
          }}
        >
          <Download size={13} aria-hidden="true" /> {t('detailImportSongsLink')}
        </Link>
        {profile.isShadow && <DeleteShadowButton userId={profile.id} />}
      </div>
    </div>
  );
};
