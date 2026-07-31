'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIErrorBoundaryFallbackProps {
  error: Error | null;
  onRetry?: () => void;
}

/**
 * Default fallback UI for AIErrorBoundary. Split out from the class component
 * so it can use `useTranslations` — class components can't call hooks
 * directly, but they can render a function component that does.
 */
export function AIErrorBoundaryFallback({ error, onRetry }: AIErrorBoundaryFallbackProps) {
  const t = useTranslations('AI');

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
      <div className="flex items-start gap-4">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-destructive">{t('errorBoundaryTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {error?.message || t('errorBoundaryDefaultMessage')}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
              <RefreshCw className="h-3 w-3 mr-2" />
              {t('errorBoundaryRetryButton')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
