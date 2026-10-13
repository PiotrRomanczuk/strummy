import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { AuthLayout, AuthHeader } from '@/components/auth';
import AcceptInvitationForm from '@/components/auth/AcceptInvitationForm';

export default async function AcceptInvitationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in via cookie session → go to dashboard.
  // Invited users arrive via GoTrue hash redirect with no cookie session yet,
  // so getUser() returns null for them and the form handles the hash.
  if (user) redirect('/dashboard');

  const t = await getTranslations('Auth');
  return (
    <AuthLayout>
      <AuthHeader title={t('acceptTitle')} subtitle={t('acceptSubtitle')} />
      <AcceptInvitationForm />
    </AuthLayout>
  );
}
