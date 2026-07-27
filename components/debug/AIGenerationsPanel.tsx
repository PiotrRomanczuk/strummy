import { History, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AIDebugResponse } from '@/types/health';

interface AIGenerationsPanelProps {
  ai: AIDebugResponse;
}

export function AIGenerationsPanel({ ai }: AIGenerationsPanelProps) {
  const { recentGenerations, note } = ai;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Recent AI Generations
          </CardTitle>
          <p className="text-xs text-muted-foreground italic">{note}</p>
        </div>
      </CardHeader>
      <CardContent>
        {recentGenerations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No generations recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs h-8">Agent</TableHead>
                <TableHead className="text-xs h-8">Provider</TableHead>
                <TableHead className="text-xs h-8">Model</TableHead>
                <TableHead className="text-xs h-8 text-center">OK</TableHead>
                <TableHead className="text-xs h-8 text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentGenerations.map((gen) => (
                <TableRow key={gen.id}>
                  <TableCell className="text-xs py-1.5 max-w-[120px] truncate">{gen.agentId}</TableCell>
                  <TableCell className="text-xs py-1.5">{gen.provider}</TableCell>
                  <TableCell className="text-xs py-1.5 max-w-[100px] truncate">{gen.model}</TableCell>
                  <TableCell className="py-1.5 text-center">
                    {gen.success
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-500 mx-auto" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-xs py-1.5 text-right text-muted-foreground">
                    {new Date(gen.createdAt).toLocaleTimeString('en-US')}
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
