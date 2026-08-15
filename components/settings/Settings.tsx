'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ProfileForm } from './Settings.ProfileForm';
import { Card, CardHeader } from './Settings.Card';
import { SettingsDangerZone } from './Settings.DangerZone';

type Props = {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  roleLabel: string;
  deletionScheduledFor: string | null;
};

export const Settings = ({
  userId,
  email,
  fullName,
  phone,
  avatarUrl,
  roleLabel,
  deletionScheduledFor,
}: Props) => {
  const t = useTranslations('Settings');

  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '32px 32px 64px',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
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
            {t('pageEyebrow')}
          </div>
          <h1
            style={{
              margin: '4px 0 8px',
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 44,
              letterSpacing: '-0.02em',
              fontStyle: 'italic',
            }}
          >
            {t('pageTitle')}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            {t('pageSubtitle')}
          </p>
        </div>

        <ProfileForm
          userId={userId}
          email={email}
          fullName={fullName}
          phone={phone}
          avatarUrl={avatarUrl}
          roleLabel={roleLabel}
        />

        <Card>
          <CardHeader eyebrow={t('notificationsCardEyebrow')} title={t('notificationsCardTitle')} />
          <Link
            href="/dashboard/settings/notifications"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{t('notificationsLinkTitle')}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>
                {t('notificationsLinkDescription')}
              </div>
            </div>
            <span style={{ color: 'var(--ink-4)', fontSize: 18 }}>→</span>
          </Link>
        </Card>

        <SettingsDangerZone deletionScheduledFor={deletionScheduledFor} />
      </div>
    </div>
  );
};
