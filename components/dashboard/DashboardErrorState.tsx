'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { Check, Copy, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logger } from '@/lib/logger';

export type DashboardErrorStateProps = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Used in the log line, e.g. "Songs" -> logged as "[Songs Error]". */
  logTag: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  backHref?: string;
};

/**
 * Shared error boundary UI for `app/dashboard/*\/error.tsx` routes.
 *
 * In production Next.js strips `error.message` for errors thrown across the
 * Server Component boundary, replacing it with a generic message — only
 * `error.digest` survives. That digest is the one thing that lets a user's
 * bug report be correlated with the real error in server/Vercel logs, so it
 * is always shown here (it's an opaque id, not sensitive) rather than gated
 * behind NODE_ENV like the raw message is.
 */
export function DashboardErrorState({
  error,
  reset,
  logTag,
  icon: Icon,
  title,
  description,
  backHref = '/dashboard',
}: DashboardErrorStateProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    logger.error(`[${logTag} Error]`, error);
  }, [error, logTag]);

  const handleCopyDigest = async () => {
    if (!error.digest) return;
    await navigator.clipboard.writeText(error.digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Icon className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mt-2">
                  {error.message}
                </p>
              )}
              {error.digest && (
                <button
                  type="button"
                  onClick={handleCopyDigest}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-muted-foreground font-mono mt-1"
                  title="Copy error code to share with support"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Error code: {error.digest}
                </button>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={reset} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
              <Button variant="outline" asChild>
                <a href={backHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
