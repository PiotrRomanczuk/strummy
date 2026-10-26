import { Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AIDebugResponse } from '@/types/health';

interface AIProviderPanelProps {
  ai: AIDebugResponse;
}

export function AIProviderPanel({ ai }: AIProviderPanelProps) {
  const { providerFactory, streamingAnalytics, agents } = ai;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cpu className="h-4 w-4" />
          AI Provider
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Row label="Configured Provider" value={<Badge variant="outline">{providerFactory.configuredProvider}</Badge>} />
          <Row label="Fallback Order" value={providerFactory.fallbackOrder.join(' → ')} />
          <Row label="Registered Agents" value={agents.length.toString()} />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Streaming</p>
          <Row label="Active Sessions" value={streamingAnalytics.activeSessions.toString()} />
          <Row label="Total Sessions (in-mem)" value={streamingAnalytics.aggregate.totalSessions.toString()} />
          <Row label="Avg TTFT" value={`${streamingAnalytics.aggregate.averageTTFT}ms`} />
          <Row label="Errors" value={streamingAnalytics.aggregate.errorSessions.toString()} />
        </div>

        {agents.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agents</p>
            <div className="flex flex-wrap gap-1">
              {agents.map((a) => (
                <Badge key={a.id} variant="secondary" className="text-xs">{a.name}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
