import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { redirect } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type AppleShortcutSongImportLog = {
  id: string;
  user_id: string | null;
  spotify_url: string | null;
  spotify_track_id: string | null;
  song_title: string | null;
  song_artist: string | null;
  song_id: string | null;
  status: 'success' | 'duplicate' | 'error';
  error_message: string | null;
  http_status: number | null;
  source: 'shortcut' | 'api' | 'debug-page';
  created_at: string;
};

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
    console.error('Failed to fetch import logs:', error);
  }

  const typedLogs = (logs as AppleShortcutSongImportLog[]) || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Logs</h1>
        <p className="text-sm text-muted-foreground">Recent shortcut song import requests.</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Song</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {typedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No import logs found
                </TableCell>
              </TableRow>
            ) : (
              typedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {log.song_title ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{log.song_title}</span>
                        {log.song_artist && <span className="text-xs text-muted-foreground">by {log.song_artist}</span>}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'completed' : log.status === 'error' ? 'destructive' : 'secondary'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground" title={log.error_message || ''}>
                    {log.error_message || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
