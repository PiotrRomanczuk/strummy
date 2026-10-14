'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type ActionResult =
  { ok: true; noNextLesson?: true; noTranscript?: true } | { ok: false; error: string };

/**
 * One pending flag + one toast policy for every button on the draft card:
 * run the action, toast the outcome, refresh the page so the server-rendered
 * lesson (notes, songs, assignments) and the ✓ marks catch up.
 */
export function useTranscriptDraft(t: (key: string) => string) {
  const messages = {
    saved: t('draftSaved'),
    failed: t('draftGenerateFailed'),
    noNextLesson: t('draftNoNextLesson'),
    noTranscript: t('draftNoTranscript'),
  };
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>, successMessage = messages.saved) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error || messages.failed);
        return;
      }
      if (result.noNextLesson) {
        toast.warning(messages.noNextLesson);
        return;
      }
      if (result.noTranscript) {
        toast.warning(messages.noTranscript);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });

  return { isPending, run };
}
