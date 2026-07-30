'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logger } from '@/lib/logger';

/**
 * Error boundary for calendar routes
 * Follows CLAUDE.md Standards (Section 2)
 */
export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Calendar');
  useEffect(() => {
    logger.error('[Calendar Error]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{t('errorTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('errorMessage')}</p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mt-2">
                  {error.message}
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={reset} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('tryAgain')}
              </Button>
              <Button variant="outline" asChild>
                <a href="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  {t('dashboardLink')}
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
