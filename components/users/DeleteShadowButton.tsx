'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { deleteShadowUser } from '@/app/dashboard/actions';

type Props = { userId: string };

export const DeleteShadowButton = ({ userId }: Props) => {
  const t = useTranslations('Users');
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleDelete = useCallback(() => {
    setError('');
    startTransition(async () => {
      try {
        await deleteShadowUser(userId);
        router.push('/dashboard/users');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('deleteShadowErrorFallback'));
        setConfirming(false);
      }
    });
  }, [userId, router, t]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{
          background: 'none',
          border: '1px solid var(--danger)',
          borderRadius: 6,
          padding: '6px 12px',
          cursor: 'pointer',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--danger)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {t('deleteShadowButton')}
      </button>
    );
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
        {t('deleteShadowConfirmPrompt')}
      </span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        style={{
          background: 'var(--danger)',
          border: 'none',
          borderRadius: 6,
          padding: '6px 12px',
          cursor: isPending ? 'wait' : 'pointer',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {isPending ? t('deleteShadowDeletingLabel') : t('deleteShadowYesButton')}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        style={{
          background: 'none',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: '6px 12px',
          cursor: 'pointer',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {t('cancelButton')}
      </button>
      {error && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--danger)' }}>
          {error}
        </span>
      )}
    </span>
  );
};
