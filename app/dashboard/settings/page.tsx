import '@/app/design-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import { Settings } from '@/components/settings/Settings';
import { IntegrationsSection } from '@/components/settings/IntegrationsSection';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { DELETION_GRACE_PERIOD_DAYS } from '@/lib/auth/account-deletion.constants';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

const roleLabelFrom = (isAdmin: boolean, isTeacher: boolean, isStudent: boolean): string => {
  const roles: string[] = [];
  if (isAdmin) roles.push('Admin');
  if (isTeacher) roles.push('Teacher');
  if (isStudent) roles.push('Student');
  return roles.length > 0 ? roles.join(' · ') : 'No role assigned';
};

export default async function SettingsPage() {
  const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/settings');
  }

  const supabase = await createClient();
  // user.id is the auth id, never profiles.id -- that PK is independently
  // minted by handle_new_user (only equal to the auth id by historical
  // coincidence for accounts predating the identity-model rebuild).
  const { data } = await supabase
    .from('profiles')
    .select('full_name, phone, avatar_url, deletion_requested_at')
    .eq('user_id', user.id)
    .single();

  const deletionRequestedAt = data?.deletion_requested_at as string | null | undefined;
  const deletionScheduledFor = deletionRequestedAt
    ? new Date(
        new Date(deletionRequestedAt).getTime() + DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
      ).toISOString()
    : null;

  const { data: googleIntegration } = await supabase
    .from('user_integrations')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle();

  // Integrations and API keys are studio-operator tools. A student has no
  // documented use for a long-lived programmatic credential, and showing the
  // section invites them to mint one.
  const showIntegrations = isAdmin || isTeacher;
  const showApiKeys = isAdmin || isTeacher;

  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <Settings
        userId={user.id}
        email={user.email ?? ''}
        fullName={(data?.full_name as string) ?? null}
        phone={(data?.phone as string) ?? null}
        avatarUrl={(data?.avatar_url as string) ?? null}
        roleLabel={roleLabelFrom(isAdmin, isTeacher, isStudent)}
        deletionScheduledFor={deletionScheduledFor}
      />
      {showIntegrations && (
        <div className="mx-auto mt-8 max-w-2xl px-6">
          <IntegrationsSection isGoogleConnected={Boolean(googleIntegration)} />
        </div>
      )}
      {showApiKeys && (
        <div className="mx-auto mt-8 max-w-2xl px-6 pb-16">
          <ApiKeyManager />
        </div>
      )}
    </div>
  );
}
