'use client';

import Link from 'next/link';
import FormAlert from '@/components/shared/FormAlert';
import { Button } from '@/components/ui/button';

/**
 * Shown instead of the password fields when the recovery link cannot produce a
 * session (expired, already used, or opened without one). Replaces the form
 * rather than annotating it — a form that cannot possibly succeed should not be
 * fillable, and the user needs the next action, not just a diagnosis.
 */
export function ResetPasswordLinkError({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <FormAlert type="error" message={message} />
      <Button asChild variant="outline" className="w-full">
        <Link href="/forgot-password">Request a new reset link</Link>
      </Button>
    </div>
  );
}
