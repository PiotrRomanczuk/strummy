import { Skeleton } from '@/components/ui/skeleton';

export default function AIUsageLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>

      <Skeleton className="h-72 w-full" />
    </div>
  );
}
