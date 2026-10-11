'use client';

import { useCallback, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { inviteUser } from '@/app/dashboard/actions';

const fieldStyle = {
  padding: '8px 10px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--paper)',
  fontFamily: 'var(--sans)',
  fontSize: 13,
  color: 'var(--ink)',
  minWidth: 180,
} as const;

/**
 * Admin-only: invite a colleague as a teacher from the roster header.
 * `inviteUser` already existed with no UI caller (tests/flows/README.md,
 * "cheapest wins"); this is that caller. Mirrors InviteShadowButton.
 */
export const InviteTeacherButton = () => {
  const t = useTranslations('Users');
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSend = useCallback(() => {
    setError('');
    startTransition(async () => {
      try {
        await inviteUser(email.trim(), name.trim(), 'teacher');
        setSent(true);
        setIsOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('inviteTeacherErrorFallback'));
      }
    });
  }, [email, name, t]);

  if (sent) {
    return (
      <span
        data-testid="invite-teacher-sent"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--success)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
        }}
      >
        {t('inviteTeacherSentLabel')}
      </span>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        data-testid="invite-teacher-open"
        onClick={() => setIsOpen(true)}
        className="ui-chip"
        style={{
          marginBottom: 10,
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid var(--ink)',
          background: 'transparent',
          color: 'var(--ink)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
        }}
      >
        {t('inviteTeacherOpenButton')}
      </button>
    );
  }

  const canSend = name.trim().length > 0 && email.includes('@') && !isPending;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          data-testid="invite-teacher-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('inviteTeacherNamePlaceholder')}
          style={fieldStyle}
        />
        <input
          type="email"
          data-testid="invite-teacher-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('inviteTeacherEmailPlaceholder')}
          style={fieldStyle}
        />
        <button
          type="button"
          data-testid="invite-teacher-send"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: canSend ? 'var(--ink)' : 'var(--ink-4)',
            color: 'var(--paper)',
            fontSize: 12,
            fontWeight: 500,
            cursor: isPending ? 'wait' : 'pointer',
            fontFamily: 'var(--sans)',
          }}
        >
          {isPending ? t('sendingLabel') : t('inviteTeacherSendButton')}
        </button>
      </div>
      {error && (
        <div
          data-testid="invite-teacher-error"
          style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
