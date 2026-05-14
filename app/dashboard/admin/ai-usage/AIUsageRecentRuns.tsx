import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ExecutionLog {
  id: string;
  agent_id: string;
  successful: boolean;
  execution_time: number;
  error_code: string | null;
  timestamp: string;
}

interface RecentRunsProps {
  runs: ExecutionLog[];
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

export function AIUsageRecentRuns({ runs }: RecentRunsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No executions recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead>Error Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(run.timestamp)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{run.agent_id}</TableCell>
                  <TableCell>
                    <Badge variant={run.successful ? 'default' : 'destructive'}>
                      {run.successful ? 'OK' : 'Fail'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{run.execution_time} ms</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {run.error_code ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
