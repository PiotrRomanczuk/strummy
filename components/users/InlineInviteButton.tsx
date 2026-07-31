'use client';

import { useCallback, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { inviteShadowUser, sendUserInvite } from '@/app/dashboard/actions';

type Props = {
  userId: string;
  inviteEmail: string;
  /**
   * True when this profile was already invited but never signed in. Its address
   * already lives on the row, so re-running inviteShadowUser would wrongly write
   * invite_email onto a non-shadow profile -- dispatch straight to sendUserInvite.
   */
  isResend?: boolean;
};

export const InlineInviteButton = ({ userId, inviteEmail, isResend = false }: Props) => {
  const t = useTranslations('Users');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleInvite = useCallback(() => {
    setError('');
    startTransition(async () => {
      try {
        if (isResend) {
          await sendUserInvite(userId);
        } else {
          await inviteShadowUser(userId, inviteEmail);
        }
        setSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('inviteInlineErrorFallback'));
      }
    });
  }, [userId, inviteEmail, isResend, t]);

  if (sent) {
    return (
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--success)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {t('inviteInlineSentLabel')}
      </span>
    );
  }

  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        type="button"
        onClick={handleInvite}
        disabled={isPending}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: isPending ? 'wait' : 'pointer',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: isPending ? 'var(--ink-4)' : 'var(--gold-2)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {isPending
          ? t('sendingLabel')
          : isResend
            ? t('inviteInlineResendButtonLabel')
            : t('inviteInlineButtonLabel')}
      </button>
      {error && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--danger)' }}>
          {error}
        </span>
      )}
    </span>
  );
};
