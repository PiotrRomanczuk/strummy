import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { redirect } from 'next/navigation';
import { logger } from '@/lib/logger';
import { ImportLogsTable } from '@/components/admin/import-logs/ImportLogsTable';
import type { AppleShortcutSongImportLog } from '@/components/admin/import-logs/import-logs.types';

export const metadata = { title: 'Import Logs' };

export default async function ImportLogsPage() {
  const { user, isAdmin } = await getUserWithRolesSSR();

  if (!user) redirect('/sign-in?redirect=/dashboard/admin/import-logs');
  if (!isAdmin) redirect('/dashboard');

  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from('apple_shortcut_song_import_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    logger.error('Failed to fetch import logs:', error);
  }

  const typedLogs = (logs as AppleShortcutSongImportLog[]) || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Logs</h1>
        <p className="text-sm text-muted-foreground">Recent shortcut song import requests.</p>
      </div>

      <div className="rounded-md border">
        <ImportLogsTable logs={typedLogs} />
      </div>
    </div>
  );
}
