'use client';

import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

interface OnboardingBoundaryProps {
  children: React.ReactNode;
}

/**
 * Error boundary wrapper for the v2 onboarding flow.
 * Shows a friendly error card if the onboarding component fails to load.
 */
export function OnboardingBoundary({ children }: OnboardingBoundaryProps) {
  return (
    <ErrorBoundary label="Onboarding failed to load">
      {children}
    </ErrorBoundary>
  );
}
