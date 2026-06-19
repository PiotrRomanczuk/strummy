import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { redirect } from 'next/navigation';
import { HistoricalCalendarSync } from '@/components/lessons/integrations/HistoricalCalendarSync';
import { CalendarWebhookControl } from '@/components/lessons/integrations/CalendarWebhookControl';
import { IntegrationsSection } from '@/components/settings/IntegrationsSection';

export default async function CalendarPage() {
  const { user } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/calendar');
  }

  const supabase = await createClient();
  const { data: googleIntegration } = await supabase
    .from('user_integrations')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle();

  const isGoogleConnected = Boolean(googleIntegration);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sync your Google Calendar lessons and manage your schedule.
        </p>
      </div>

      <IntegrationsSection isGoogleConnected={isGoogleConnected} />

      {isGoogleConnected && (
        <>
          <CalendarWebhookControl />
          <HistoricalCalendarSync />
        </>
      )}

      {!isGoogleConnected && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Connect your Google Calendar above to import lessons and enable real-time sync.
        </div>
      )}
    </div>
  );
}
