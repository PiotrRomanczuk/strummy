import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AgentRow {
  agentId: string;
  count: number;
  successCount: number;
}

interface AgentSummaryProps {
  agents: AgentRow[];
}

export function AIUsageAgentSummary({ agents }: AgentSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Agents by Usage</CardTitle>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agent executions recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent ID</TableHead>
                <TableHead className="text-right">Executions</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map(({ agentId, count, successCount }) => (
                <TableRow key={agentId}>
                  <TableCell className="font-mono text-xs">{agentId}</TableCell>
                  <TableCell className="text-right">{count}</TableCell>
                  <TableCell className="text-right">
                    {count > 0 ? `${((successCount / count) * 100).toFixed(1)}%` : '—'}
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
