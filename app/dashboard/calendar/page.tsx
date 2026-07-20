import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getLessonsInRange } from '@/lib/services/lessons-queries';
import { MonthCalendar } from '@/components/lessons/editorial/MonthCalendar';
import { HistoricalCalendarSync } from '@/components/lessons/integrations/HistoricalCalendarSync';
import { CalendarWebhookControl } from '@/components/lessons/integrations/CalendarWebhookControl';
import { IntegrationsSection } from '@/components/settings/IntegrationsSection';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function parseMonth(value: string | string[] | undefined, fallback: Date): Date {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}-01T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/calendar');
  }

  const params = await searchParams;
  const now = new Date();
  const month = parseMonth(params.month, now);
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });

  const lessons = await getLessonsInRange(
    user.id,
    { isAdmin, isTeacher, isStudent },
    gridStart.toISOString(),
    addDays(gridEnd, 1).toISOString()
  );

  const supabase = await createClient();
  const { data: googleIntegration } = await supabase
    .from('user_integrations')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle();

  const isGoogleConnected = Boolean(googleIntegration);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your lessons at a glance. Click any lesson to open it.
        </p>
      </div>

      <MonthCalendar lessons={lessons} month={month} now={now} showStudent={isTeacher || isAdmin} />

      <IntegrationsSection isGoogleConnected={isGoogleConnected} />

      {isGoogleConnected && (
        <>
          <CalendarWebhookControl />
          <HistoricalCalendarSync />
        </>
      )}
    </div>
  );
}
