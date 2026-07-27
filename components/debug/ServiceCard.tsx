'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import type { ServiceCheck } from '@/types/health';

interface ServiceCardProps {
  check: ServiceCheck;
}

export function ServiceCard({ check }: ServiceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!check.details && Object.keys(check.details).length > 0;

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{check.name}</CardTitle>
          <StatusBadge status={check.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {check.latencyMs !== undefined && (
          <p className="text-xs text-muted-foreground">{check.latencyMs}ms</p>
        )}
        {check.message && (
          <p className="text-xs text-muted-foreground truncate">{check.message}</p>
        )}
        <p className="text-xs text-muted-foreground/60">
          {new Date(check.checkedAt).toLocaleTimeString('en-US')}
        </p>
        {hasDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
            Details
          </Button>
        )}
        {expanded && hasDetails && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(check.details, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
