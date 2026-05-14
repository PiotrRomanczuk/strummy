import { ListOrdered } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AIDebugResponse } from '@/types/health';

interface AIQueuePanelProps {
  ai: AIDebugResponse;
}

export function AIQueuePanel({ ai }: AIQueuePanelProps) {
  const { queue, rateLimits } = ai;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="h-4 w-4" />
          Queue & Rate Limits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Active Requests" value={queue.totalActiveRequests} />
          <Stat label="Queued" value={queue.totalQueuedRequests} />
          <Stat label="Max Concurrent/User" value={queue.config.maxConcurrentPerUser} />
          <Stat label="Active Buckets" value={rateLimits.activeMemoryBuckets} />
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Rate Limits by Role
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs h-8">Role</TableHead>
                <TableHead className="text-xs h-8 text-right">Req / min</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(rateLimits.limits).map(([role, cfg]) => (
                <TableRow key={role}>
                  <TableCell className="text-xs capitalize py-1">{role}</TableCell>
                  <TableCell className="text-xs text-right py-1">{cfg.maxRequests}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded p-2 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
