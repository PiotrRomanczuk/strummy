'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { requestAccountDeletion, cancelAccountDeletion } from '@/app/actions/account';
import { logger } from '@/lib/logger';
import { Card, CardHeader } from './Settings.Card';

type Props = {
  deletionScheduledFor: string | null;
};

export const SettingsDangerZone = ({ deletionScheduledFor }: Props) => {
  const t = useTranslations('Settings');
  const [scheduledFor, setScheduledFor] = useState(deletionScheduledFor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm(t('dangerZoneDeleteConfirm'))) {
      return;
    }

    setLoading(true);
    setError(null);
    const result = await requestAccountDeletion();
    setLoading(false);

    if ('error' in result && result.error) {
      setError(result.error);
      logger.error('Failed to request account deletion:', result.error);
      return;
    }

    if ('scheduledFor' in result && result.scheduledFor) {
      setScheduledFor(result.scheduledFor);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    const result = await cancelAccountDeletion();
    setLoading(false);

    if ('error' in result && result.error) {
      setError(result.error);
      logger.error('Failed to cancel account deletion:', result.error);
      return;
    }

    setScheduledFor(null);
  };

  return (
    <Card>
      <CardHeader eyebrow={t('dangerZoneCardEyebrow')} title={t('dangerZoneCardTitle')} />
      <div style={{ padding: '18px 24px 24px' }}>
        {scheduledFor ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
              {t('dangerZoneScheduledMessage', {
                date: new Date(scheduledFor).toLocaleDateString(),
              })}
            </p>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                padding: '9px 16px',
                borderRadius: 6,
                border: '1px solid var(--rule)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? t('dangerZoneCancellingButton') : t('dangerZoneCancelButton')}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
              {t('dangerZoneDescription')}
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              style={{
                padding: '9px 16px',
                borderRadius: 6,
                border: '1px solid var(--destructive, #c0392b)',
                background: 'transparent',
                color: 'var(--destructive, #c0392b)',
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? t('dangerZoneDeletingButton') : t('dangerZoneDeleteButton')}
            </button>
          </>
        )}
        {error && (
          <p
            style={{ fontSize: 12, color: 'var(--destructive, #c0392b)', marginTop: 10 }}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </Card>
  );
};
