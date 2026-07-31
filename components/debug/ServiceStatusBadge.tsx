import { CheckCircle, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ServiceStatus } from '@/types/health';

const CONFIG: Record<ServiceStatus, { label: string; icon: React.ElementType; className: string }> = {
  healthy: { label: 'Healthy', icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' },
  degraded: { label: 'Degraded', icon: AlertTriangle, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  error: { label: 'Error', icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  unconfigured: { label: 'Not Configured', icon: MinusCircle, className: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
};

interface StatusBadgeProps {
  status: ServiceStatus;
  className?: string;
}

export function ServiceStatusBadge({ status, className }: StatusBadgeProps) {
  const { label, icon: Icon, className: variantClass } = CONFIG[status];
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', variantClass, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
