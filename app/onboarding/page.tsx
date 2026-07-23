import '@/app/editorial-tokens.css';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { redirect } from 'next/navigation';

import { OnboardingEditorial } from '@/components/v2/onboarding/editorial';
import { OnboardingV2Boundary } from '@/components/v2/onboarding/OnboardingBoundary';
import { createClient } from '@/lib/supabase/server';

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

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Already onboarded → straight to the dashboard.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_student, is_teacher, is_admin')
    .eq('id', user.id)
    .single();

  if (profile?.is_student || profile?.is_teacher || profile?.is_admin) {
    redirect('/dashboard');
  }

  const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0];

  return (
    <div className={`theme-editorial ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <OnboardingV2Boundary>
        <OnboardingEditorial firstName={firstName} />
      </OnboardingV2Boundary>
    </div>
  );
}
