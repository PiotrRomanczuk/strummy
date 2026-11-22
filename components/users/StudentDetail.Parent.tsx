'use client';

import type { FormEvent } from 'react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StudentParent } from '@/lib/services/student-parent-queries';

import { Card, CardHeader } from './student-detail.shared';
import { useParentLink } from './useParentLink';

type Props = { studentId: string; parent: StudentParent };

/** The student's parent: who is linked and whether they use Strummy — or a form to invite one. */
export const StudentParentCard = ({ studentId, parent }: Props) => {
  const t = useTranslations('Users');
  const { feedback, isBusy, invite, resend, unlink } = useParentLink(studentId);

  return (
    <Card>
      <CardHeader eyebrow={t('parentEyebrow')} title={t('parentTitle')} />
      <div className="px-6 pb-6" data-testid="student-parent">
        {parent.linked ? (
          <LinkedParent
            linked={parent.linked}
            isBusy={isBusy}
            onResend={resend}
            onUnlink={unlink}
          />
        ) : (
          <InviteForm parent={parent} isBusy={isBusy} onSubmit={invite} />
        )}
        {feedback && (
          <p
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            className={`mt-3 text-sm ${feedback.kind === 'error' ? 'text-destructive' : 'text-[var(--ink-3)]'}`}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </Card>
  );
};

type LinkedProps = {
  linked: NonNullable<StudentParent['linked']>;
  isBusy: boolean;
  onResend: () => void;
  onUnlink: () => void;
};

const LinkedParent = ({ linked, isBusy, onResend, onUnlink }: LinkedProps) => {
  const t = useTranslations('Users');
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--ink)]">{linked.name ?? linked.email}</p>
          {linked.email && <p className="text-xs text-[var(--ink-3)]">{linked.email}</p>}
        </div>
        <Badge variant={linked.status === 'active' ? 'secondary' : 'outline'}>
          {t(`parentStatus.${linked.status}`)}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {linked.status !== 'active' && (
          <Button size="sm" variant="outline" disabled={isBusy} onClick={onResend}>
            {t('parentResend')}
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={isBusy} onClick={onUnlink}>
          {t('parentUnlink')}
        </Button>
      </div>
    </div>
  );
};

type FormProps = {
  parent: StudentParent;
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const InviteForm = ({ parent, isBusy, onSubmit }: FormProps) => {
  const t = useTranslations('Users');
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <p className="text-xs text-[var(--ink-3)]">{t('parentHint')}</p>
      <div className="grid gap-1.5">
        <Label htmlFor="parent-name">{t('parentNameLabel')}</Label>
        <Input
          id="parent-name"
          name="fullName"
          defaultValue={parent.suggestedName ?? ''}
          maxLength={120}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="parent-email">{t('parentEmailLabel')}</Label>
        <Input
          id="parent-email"
          name="email"
          type="email"
          defaultValue={parent.suggestedEmail ?? ''}
          maxLength={254}
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={isBusy} className="self-start">
        {t('parentInvite')}
      </Button>
    </form>
  );
};
