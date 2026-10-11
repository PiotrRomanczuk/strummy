'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AIStreamStatus } from '@/hooks/useAIStream';

interface AIAssistButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  className?: string;
  /** Streaming status (optional, for enhanced streaming UI) */
  status?: AIStreamStatus;
  /** Token count to display (optional) */
  tokenCount?: number;
  /** Callback when cancel is clicked (optional, shown when streaming) */
  onCancel?: () => void;
}

/**
 * AI Assist button with gold gradient glow and shimmer animation on hover
 * Used for AI-powered features like generating lesson plans, summaries, song suggestions
 *
 * Enhanced with streaming support:
 * - Shows status (connecting/streaming/complete)
 * - Displays token count during streaming
 * - Cancel button (X icon) when streaming
 * - Shimmer animation during active streaming
 */
function AIAssistButton({
  onClick,
  disabled = false,
  loading = false,
  label = 'AI Assist',
  className,
  status,
  tokenCount,
  onCancel,
}: AIAssistButtonProps) {
  // Determine if actively streaming
  const isStreaming = status === 'streaming' || status === 'connecting';
  const isActive = loading || isStreaming;

  // Get display label based on status
  const getLabel = () => {
    if (status === 'connecting') return 'Connecting...';
    if (status === 'streaming') return 'Streaming...';
    if (status === 'complete') return 'Complete';
    if (loading) return 'Working...';
    return label;
  };

  return (
    <button
      type="button"
      onClick={isStreaming && onCancel ? onCancel : onClick}
      disabled={disabled || (loading && !onCancel)}
      // Claude Design "✦ Generate": small gold-tint button with a gold-dim rule.
      className={cn(
        'relative flex items-center gap-[5px] rounded-md px-2.5 py-1',
        'border border-[var(--gold-dim)] bg-[var(--gold-tint)] text-[var(--gold-2)]',
        'transition-opacity hover:opacity-85',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'overflow-hidden',
        isStreaming && 'animate-shimmer', // Shimmer during streaming
        className
      )}
    >
      {/* Icon */}
      {isStreaming && onCancel ? (
        <X className="size-[11px]" />
      ) : (
        <Sparkles className={cn('size-[11px]', isActive && 'animate-pulse')} />
      )}

      {/* Label */}
      <span className="text-[11px] font-medium">{getLabel()}</span>

      {/* Token Count Badge */}
      {tokenCount !== undefined && tokenCount > 0 && isStreaming && (
        <Badge variant="secondary" className="text-xs ml-1">
          {tokenCount}
        </Badge>
      )}

      {/* Streaming shimmer animation */}
      {isStreaming && (
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-gradient-to-r from-transparent via-primary/30 to-transparent',
            'animate-shimmer-slide',
            'pointer-events-none'
          )}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

/**
 * AI Toolbar with multiple action chips
 * Used in lesson detail view for various AI actions
 */
interface AIToolbarAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface AIToolbarProps {
  actions: AIToolbarAction[];
  className?: string;
}

function AIToolbar({ actions, className }: AIToolbarProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
            'bg-muted hover:bg-primary/10',
            'text-xs font-medium text-muted-foreground hover:text-primary',
            'transition-colors duration-200',
            'border border-transparent hover:border-primary/20'
          )}
        >
          {action.icon || <Sparkles className="h-3 w-3" />}
          {action.label}
        </button>
      ))}
    </div>
  );
}

export { AIAssistButton, AIToolbar, type AIToolbarAction };
