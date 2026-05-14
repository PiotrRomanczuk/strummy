import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ErrorBreakdownProps {
  topErrors: Array<{ code: string; count: number }>;
}

export function AIUsageErrorBreakdown({ topErrors }: ErrorBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {topErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors recorded.</p>
        ) : (
          <ul className="space-y-2">
            {topErrors.map(({ code, count }) => (
              <li key={code} className="flex items-center justify-between">
                <Badge variant="destructive">{code}</Badge>
                <span className="text-sm font-medium">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
