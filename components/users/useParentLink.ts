import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { inviteParent, resendParentInvite, unlinkParent } from '@/app/actions/parent-link';
import { useIsHydrated } from '@/hooks/useIsHydrated';

export type ParentLinkFeedback = { kind: 'ok' | 'error'; text: string } | null;

/** Action errors a teacher can act on get their own sentence; the rest a generic one. */
const ERROR_KEYS: Record<string, string> = {
  'This email belongs to a student or a teacher': 'parentErrorTaken',
  "This is the student's own email": 'parentErrorOwnEmail',
  'Invalid name or email': 'parentErrorInvalid',
};

/** Invite, re-send and unlink for the student page's parent card. */
export function useParentLink(studentId: string) {
  const t = useTranslations('Users');
  const router = useRouter();
  const isHydrated = useIsHydrated();
  const [feedback, setFeedback] = useState<ParentLinkFeedback>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => ReturnType<typeof inviteParent>, okText: string) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      if ('error' in result) {
        setFeedback({ kind: 'error', text: t(ERROR_KEYS[result.error] ?? 'parentErrorGeneric') });
        return;
      }
      setFeedback(
        result.inviteError
          ? { kind: 'error', text: t('parentInviteFailed', { reason: result.inviteError }) }
          : { kind: 'ok', text: okText }
      );
      router.refresh();
    });
  };

  // Uncontrolled inputs read on submit: a value typed before hydration survives it.
  const invite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const fullName = String(fields.get('fullName') ?? '');
    const email = String(fields.get('email') ?? '');
    run(() => inviteParent({ studentId, fullName, email }), t('parentInvited'));
  };

  return {
    feedback,
    // A click before hydration would be lost silently; the buttons wait for React.
    isBusy: isPending || !isHydrated,
    invite,
    resend: () => run(() => resendParentInvite({ studentId }), t('parentInvited')),
    unlink: () => run(() => unlinkParent({ studentId }), t('parentUnlinked')),
  };
}
