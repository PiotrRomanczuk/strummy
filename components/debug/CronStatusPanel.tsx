import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CronJobStatus } from '@/types/health';

interface CronStatusPanelProps {
  crons: CronJobStatus[];
}

const TRIGGER_LABEL: Record<CronJobStatus['trigger'], string> = {
  'vercel-cron': 'vercel cron',
  'via-dispatcher': 'via dispatcher',
  manual: 'manual only',
};

const TRIGGER_CLASS: Record<CronJobStatus['trigger'], string> = {
  'vercel-cron': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'via-dispatcher': 'bg-muted text-muted-foreground',
  manual: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
};

export function CronStatusPanel({ crons }: CronStatusPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Cron Jobs ({crons.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {crons.map((cron) => (
            <div
              key={cron.path}
              className="flex items-center justify-between py-1.5 border-b last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{cron.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{cron.path}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${TRIGGER_CLASS[cron.trigger]}`}
                >
                  {TRIGGER_LABEL[cron.trigger]}
                </span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                  {cron.schedule}
                </code>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
