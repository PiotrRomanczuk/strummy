'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { disconnectGoogle } from '@/app/dashboard/calendar-actions';

interface IntegrationsSectionProps {
  isGoogleConnected: boolean;
}

const pill = (color: string) => ({
  fontFamily: 'var(--mono)',
  fontSize: 10,
  padding: '3px 8px',
  borderRadius: 4,
  background: `color-mix(in oklab, ${color} 10%, transparent)`,
  color,
  textTransform: 'uppercase' as const,
  letterSpacing: '.1em',
});

const smallButton = (isPrimary: boolean) => ({
  padding: '5px 12px',
  borderRadius: 8,
  border: isPrimary ? 'none' : '1px solid var(--rule)',
  background: isPrimary ? 'var(--ink)' : 'var(--card)',
  color: isPrimary ? 'var(--paper)' : 'var(--ink-2)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
});

type CardProps = {
  name: string;
  kind: string;
  desc: string;
  logo: string;
  detail: string;
  action: ReactNode;
};

/** Claude Design integration card: brand tile, name + kind, description, detail line, state. */
const IntegrationCard = ({ name, kind, desc, logo, detail, action }: CardProps) => (
  <div
    style={{
      padding: 18,
      border: '1px solid var(--rule)',
      borderRadius: 12,
      background: 'var(--card)',
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: logo,
        color: 'var(--on-accent)',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--serif)',
        fontSize: 18,
        fontWeight: 600,
        flex: '0 0 44px',
      }}
    >
      {name[0]}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{name}</span>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.12em',
          }}
        >
          {kind}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55, marginTop: 4 }}>
        {desc}
      </div>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {detail}
        </span>
        {action}
      </div>
    </div>
  </div>
);

/** Settings · Integrations — the services Strummy actually talks to. */
export function IntegrationsSection({ isGoogleConnected }: IntegrationsSectionProps) {
  const t = useTranslations('Settings');
  const tc = useTranslations('Calendar');
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, startDisconnect] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    setIsConnecting(true);
    router.push('/api/auth/google');
  };

  const handleDisconnect = () => {
    setError(null);
    startDisconnect(async () => {
      const result = await disconnectGoogle();
      if (result.success) router.refresh();
      else setError(result.error ?? tc('disconnectFailed'));
    });
  };

  const googleAction = isGoogleConnected ? (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={pill('var(--success)')}>{t('statusConnected')}</span>
      <button
        type="button"
        onClick={handleDisconnect}
        disabled={isDisconnecting}
        style={smallButton(false)}
      >
        {isDisconnecting ? tc('disconnecting') : t('disconnect')}
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={handleConnect}
      disabled={isConnecting}
      aria-label={isConnecting ? undefined : tc('connectButton')}
      style={smallButton(true)}
    >
      {isConnecting ? tc('connecting') : t('connect')}
    </button>
  );

  return (
    <div>
      <div className="ui-integrations">
        <IntegrationCard
          name={tc('googleCalendarTitle')}
          kind={t('googleKind')}
          desc={t('googleDesc')}
          logo="#4285F4"
          detail={isGoogleConnected ? t('googleDetailOn') : t('googleDetailOff')}
          action={googleAction}
        />
        <IntegrationCard
          name="Spotify"
          kind={t('spotifyKind')}
          desc={t('spotifyDesc')}
          logo="#1db954"
          detail={t('spotifyDetail')}
          action={<span style={pill('var(--success)')}>{t('statusBuiltIn')}</span>}
        />
      </div>
      {error && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
