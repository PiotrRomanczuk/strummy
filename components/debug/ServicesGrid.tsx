import { ServiceCard } from './ServiceCard';
import { ServiceStatusBadge } from './ServiceStatusBadge';
import type { HealthResponse } from '@/types/health';

interface ServicesGridProps {
  health: HealthResponse;
}

export function ServicesGrid({ health }: ServicesGridProps) {
  const services = Object.values(health.services);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">API Services</h2>
        <ServiceStatusBadge status={health.overall} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {services.map((check) => (
          <ServiceCard key={check.name} check={check} />
        ))}
      </div>
    </div>
  );
}
