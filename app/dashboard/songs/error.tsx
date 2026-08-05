'use client';

import { Music } from 'lucide-react';
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState';

/**
 * Error boundary for songs routes
 */
export default function SongsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardErrorState
      error={error}
      reset={reset}
      logTag="Songs"
      icon={Music}
      title="Error loading songs"
      description="We couldn't load the songs. Please try again."
    />
  );
}
