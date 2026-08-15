'use client';

import * as React from 'react';
import { logger } from '@/lib/logger';
import { AIErrorBoundaryFallback } from './AIErrorBoundary.Fallback';

interface AIErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback UI to show on error */
  fallback?: React.ReactNode;
  /** Callback when retry is clicked */
  onRetry?: () => void;
}

interface AIErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for AI streaming components
 *
 * Catches errors during streaming and shows a user-friendly error message
 * with a retry button. Automatically clears error on retry.
 *
 * @example
 * ```tsx
 * <AIErrorBoundary onRetry={() => aiStream.reset()}>
 *   <AIStreamingComponent />
 * </AIErrorBoundary>
 * ```
 */
export class AIErrorBoundary extends React.Component<AIErrorBoundaryProps, AIErrorBoundaryState> {
  constructor(props: AIErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AIErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[AIErrorBoundary] Caught error', error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  handleRetry = () => {
    // Clear error state
    this.setState({ hasError: false, error: null });
    // Call parent retry callback
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <AIErrorBoundaryFallback
          error={this.state.error}
          onRetry={this.props.onRetry ? this.handleRetry : undefined}
        />
      );
    }

    return this.props.children;
  }
}
