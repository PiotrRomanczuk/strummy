import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardsProps {
  totalExecutions: number;
  successRate: number;
  avgLatencyMs: number;
  errorRate: number;
}

export function AIUsageStatCards({
  totalExecutions,
  successRate,
  avgLatencyMs,
  errorRate,
}: StatCardsProps) {
  const stats = [
    {
      label: 'Total Executions',
      value: totalExecutions.toLocaleString(),
    },
    {
      label: 'Success Rate',
      value: `${(successRate * 100).toFixed(1)}%`,
    },
    {
      label: 'Avg Latency',
      value: `${Math.round(avgLatencyMs)} ms`,
    },
    {
      label: 'Error Rate',
      value: `${(errorRate * 100).toFixed(1)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value }) => (
        <Card key={label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
