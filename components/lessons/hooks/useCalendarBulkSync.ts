import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface SyncProgress {
  currentMonth: string;
  monthIndex: number;
  totalMonths: number;
  imported: number;
  skipped: number;
  errors: number;
}

interface SyncResults {
  imported: number;
  skipped: number;
  errors: number;
  total: number;
}

interface SyncEvent {
  type: string;
  [key: string]: unknown;
}

export function useCalendarBulkSync() {
  const t = useTranslations('Calendar');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [results, setResults] = useState<SyncResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const syncIdRef = useRef<string | null>(null);

  const startSync = useCallback(
    async (startDate: string, endDate: string) => {
      setIsRunning(true);
      setProgress(null);
      setResults(null);
      setError(null);
      setEvents([]);
      syncIdRef.current = null;

      try {
        const response = await fetch('/api/calendar/sync/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error(t('noResponseBody'));

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = JSON.parse(line.slice(6)) as SyncEvent;
            setEvents((prev) => [...prev, data]);

            switch (data.type) {
              case 'init':
                syncIdRef.current = data.syncId as string;
                break;
              case 'month_start':
                setProgress((prev) => ({
                  currentMonth: data.month as string,
                  monthIndex: data.monthIndex as number,
                  totalMonths: data.totalMonths as number,
                  imported: prev?.imported || 0,
                  skipped: prev?.skipped || 0,
                  errors: prev?.errors || 0,
                }));
                break;
              case 'event_imported':
                setProgress((prev) => (prev ? { ...prev, imported: prev.imported + 1 } : prev));
                break;
              case 'event_skipped':
                setProgress((prev) => (prev ? { ...prev, skipped: prev.skipped + 1 } : prev));
                break;
              case 'event_error':
                setProgress((prev) => (prev ? { ...prev, errors: prev.errors + 1 } : prev));
                break;
              case 'complete':
                setResults(data.results as SyncResults);
                break;
              case 'error':
                setError(data.error as string);
                break;
              case 'cancelled':
                setError(t('syncCancelled'));
                break;
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('unknownError'));
      } finally {
        setIsRunning(false);
      }
    },
    [t]
  );

  const cancelSync = useCallback(async () => {
    if (!syncIdRef.current) return;
    try {
      await fetch(`/api/calendar/sync/stream?syncId=${syncIdRef.current}`, {
        method: 'DELETE',
      });
    } catch {
      // Best-effort cancel
    }
  }, []);

  return { isRunning, progress, results, error, events, startSync, cancelSync };
}
