'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { setTeacherLeadReplied } from '@/app/actions/admin/teacher-leads';

type Props = { leadId: string; isHandled: boolean; leadName: string };

/** "Mark replied" / "Undo" for one lead. The list re-renders from the server after the change. */
export function TeacherLeadsReplyButton({ leadId, isHandled, leadName }: Props) {
  const t = useTranslations('TeacherLeads');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () =>
    startTransition(async () => {
      const result = await setTeacherLeadReplied({ id: leadId, isReplied: !isHandled });
      if (!result.success) {
        toast.error(t(`errors.${result.error}`));
        return;
      }
      toast.success(isHandled ? t('toast.reopened') : t('toast.replied'));
      router.refresh();
    });

  return (
    <Button
      type="button"
      size="sm"
      variant={isHandled ? 'ghost' : 'outline'}
      disabled={isPending}
      onClick={onClick}
      aria-label={
        isHandled
          ? t('action.undoLabel', { name: leadName })
          : t('action.markLabel', { name: leadName })
      }
    >
      {isHandled ? <Undo2 aria-hidden /> : <Check aria-hidden />}
      {isHandled ? t('action.undo') : t('action.mark')}
    </Button>
  );
}
