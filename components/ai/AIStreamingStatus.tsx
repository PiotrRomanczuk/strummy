'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Loader2, X, Check, AlertCircle, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AIStreamStatus } from '@/hooks/useAIStream';

interface AIStreamingStatusProps {
  /** Current streaming status */
  status: AIStreamStatus;
  /** Token count (if available) */
  tokenCount?: number;
  /** Reasoning/thinking content (for models like DeepSeek R1) */
  reasoning?: string;
  /** Estimated total tokens (for progress calculation) */
  estimatedTotal?: number;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Queue position */
  queuePosition?: number;
  /** Queue message */
  queueMessage?: string;
  /** Error message (if status is 'error') */
  error?: Error | null;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Optional className */
  className?: string;
}

/**
 * Status component for AI streaming operations
 *
 * Displays:
 * - Current status (connecting/streaming/complete/error)
 * - Progress bar (if estimated total provided)
 * - Token count badge
 * - Reasoning collapsible section (for DeepSeek R1)
 * - Cancel button
 * - Error display with retry option
 *
 * @example
 * ```tsx
 * <AIStreamingStatus
 *   status={aiStream.status}
 *   tokenCount={aiStream.tokenCount}
 *   reasoning={aiStream.reasoning}
 *   onCancel={aiStream.cancel}
 * />
 * ```
 */
export function AIStreamingStatus({
  status,
  tokenCount = 0,
  reasoning,
  estimatedTotal,
  progress: providedProgress,
  queuePosition: _queuePosition,
  queueMessage,
  error,
  onCancel,
  onRetry,
  className,
}: AIStreamingStatusProps) {
  const t = useTranslations('AI');
  const [isReasoningOpen, setIsReasoningOpen] = React.useState(false);

  // Use provided progress or calculate from tokens
  const progress =
    providedProgress !== undefined
      ? providedProgress
      : estimatedTotal && tokenCount > 0
        ? Math.min((tokenCount / estimatedTotal) * 100, 100)
        : undefined;

  // Don't render if idle
  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3',
        'animate-in fade-in slide-in-from-bottom-2 duration-300',
        className
      )}
    >
      {/* Status Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Status Icon */}
          {status === 'connecting' && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {status === 'streaming' && <Sparkles className="h-4 w-4 text-primary animate-pulse" />}
          {status === 'complete' && <Check className="h-4 w-4 text-green-500" />}
          {status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
          {status === 'cancelled' && <X className="h-4 w-4 text-muted-foreground" />}

          {/* Status Text */}
          <span className="text-sm font-medium">
            {status === 'queued' && (queueMessage || t('streamingQueued'))}
            {status === 'connecting' && t('streamingConnecting')}
            {status === 'streaming' && t('streamingInProgress')}
            {status === 'complete' && t('streamingComplete')}
            {status === 'error' && t('streamingError')}
            {status === 'cancelled' && t('streamingCancelled')}
          </span>

          {/* Token Count Badge */}
          {tokenCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {tokenCount.toLocaleString()}{' '}
              {tokenCount === 1 ? t('streamingTokenSingular') : t('streamingTokenPlural')}
            </Badge>
          )}
        </div>

        {/* Cancel Button */}
        {(status === 'queued' || status === 'connecting' || status === 'streaming') && onCancel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-6 w-6"
            aria-label={t('streamingCancelAriaLabel')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {progress !== undefined && status === 'streaming' && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1" />
          <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
        </div>
      )}

      {/* Reasoning Section (DeepSeek R1, etc.) */}
      {reasoning && (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReasoningOpen(!isReasoningOpen)}
            className="w-full text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {isReasoningOpen ? t('streamingHideReasoning') : t('streamingShowReasoning')}
            <ChevronDown
              className={cn(
                'h-3 w-3 ml-auto transition-transform',
                isReasoningOpen && 'rotate-180'
              )}
            />
          </Button>
          {isReasoningOpen && (
            <div className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {reasoning}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {status === 'error' && error && (
        <div className="space-y-2">
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">{t('streamingErrorOccurred')}</p>
            <p className="text-xs mt-1">{error.message}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="w-full">
              {t('streamingRetryButton')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
