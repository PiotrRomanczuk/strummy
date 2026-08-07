'use client';

import { ListOrdered } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import type { AIDebugResponse } from '@/types/health';

interface AIQueuePanelProps {
  ai: AIDebugResponse;
}

interface RateLimitRow {
  role: string;
  maxRequests: number;
}

export function AIQueuePanel({ ai }: AIQueuePanelProps) {
  const { queue, rateLimits } = ai;
  const rateLimitRows: RateLimitRow[] = Object.entries(rateLimits.limits).map(([role, cfg]) => ({
    role,
    maxRequests: cfg.maxRequests,
  }));
  const { sortedItems, sortKey, direction, toggleSort } = useSortableTable(rateLimitRows);

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
          <Stat label="Active Buckets" value={rateLimits.activeBuckets} />
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Rate Limits by Role
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="role"
                  activeSortKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                  className="text-xs h-8"
                >
                  Role
                </SortableTableHead>
                <SortableTableHead
                  sortKey="maxRequests"
                  activeSortKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                  className="text-xs h-8"
                  align="right"
                >
                  Req / min
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((row) => (
                <TableRow key={row.role}>
                  <TableCell className="text-xs capitalize py-1">{row.role}</TableCell>
                  <TableCell className="text-xs text-right py-1">{row.maxRequests}</TableCell>
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
