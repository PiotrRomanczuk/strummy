import type { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export type SettingsTab = 'profile' | 'notifications' | 'integrations' | 'apiKeys';

const TAB_HREF: Record<SettingsTab, string> = {
  profile: '/dashboard/settings',
  notifications: '/dashboard/settings/notifications',
  integrations: '/dashboard/settings?tab=integrations',
  apiKeys: '/dashboard/settings?tab=apiKeys',
};
const TAB_KEY: Record<SettingsTab, string> = {
  profile: 'tabProfile',
  notifications: 'tabNotifications',
  integrations: 'tabIntegrations',
  apiKeys: 'tabApiKeys',
};

type Props = {
  active: SettingsTab;
  /** Integrations and API keys are studio-operator tools (teachers/admins). */
  showOperatorTabs: boolean;
  sub?: string;
  children: ReactNode;
};

/** Claude Design settings: "Account · Settings" rail on the left, the tab's page on the right. */
export async function SettingsShell({ active, showOperatorTabs, sub, children }: Props) {
  const t = await getTranslations('Settings');
  const tabs: SettingsTab[] = showOperatorTabs
    ? ['profile', 'notifications', 'integrations', 'apiKeys']
    : ['profile', 'notifications'];
  const title = t(TAB_KEY[active]);

  return (
    <div
      className="ui-settings"
      style={{ background: 'var(--ivory)', color: 'var(--ink)', fontSize: 13, lineHeight: 1.4 }}
    >
      <nav className="ui-settings-rail" aria-label={t('railTitle')}>
        <div className="ui-settings-rail-head">
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '.14em',
              marginBottom: 4,
              paddingLeft: 10,
            }}
          >
            {t('railEyebrow')}
          </div>
          <h2
            style={{
              margin: '0 0 22px',
              padding: '0 10px',
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 28,
              letterSpacing: '-0.02em',
            }}
          >
            {t('railTitle')}
          </h2>
        </div>
        <div className="ui-settings-tabs">
          {tabs.map((tab) => {
            const isActive = tab === active;
            return (
              <Link
                key={tab}
                href={TAB_HREF[tab]}
                aria-current={isActive ? 'page' : undefined}
                className="ui-settings-tab"
                style={{
                  background: isActive ? 'var(--card)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--rule)' : 'transparent'}`,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                  }}
                >
                  {t(TAB_KEY[tab])}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--mono)',
                    marginTop: 2,
                  }}
                >
                  {t(`${TAB_KEY[tab]}Sub`)}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="ui-settings-content">
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '.16em',
            }}
          >
            {t('headerEyebrow', { tab: title })}
          </div>
          <h1
            style={{
              margin: '4px 0 8px',
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 38,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          {sub && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--ink-3)',
                lineHeight: 1.55,
                maxWidth: 680,
              }}
            >
              {sub}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
