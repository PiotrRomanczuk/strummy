'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { resolveConflict } from '@/app/actions/calendar-conflicts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ConflictData {
  remote_title?: string;
  remote_scheduled_at?: string;
  remote_notes?: string;
  remote_updated?: string;
}

interface Conflict {
  id: string;
  lesson_id: string;
  conflict_data: ConflictData;
  created_at: string;
  lesson?: {
    title: string;
    scheduled_at: string;
    notes?: string | null;
    updated_at: string;
  };
}

interface ConflictListProps {
  conflicts: Conflict[];
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DiffRow({
  label,
  local,
  remote,
}: {
  label: string;
  local: string | null | undefined;
  remote: string | null | undefined;
}) {
  const differs = local !== remote;
  return (
    <div
      className={`grid grid-cols-3 gap-2 py-2 text-sm ${differs ? 'bg-yellow-50 dark:bg-yellow-950/30 rounded px-2' : ''}`}
    >
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="truncate">{local ?? '—'}</span>
      <span
        className={`truncate ${differs ? 'font-medium text-amber-700 dark:text-amber-400' : ''}`}
      >
        {remote ?? '—'}
      </span>
    </div>
  );
}

function ConflictCardBody({
  conflict,
  isPending,
  error,
  onResolve,
}: {
  conflict: Conflict;
  isPending: boolean;
  error: string | null;
  onResolve: (r: 'use_local' | 'use_remote') => void;
}) {
  const t = useTranslations('Calendar');
  const remote = conflict.conflict_data;
  const local = conflict.lesson;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {local?.title ?? remote.remote_title ?? t('conflictUntitledLesson')}
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(conflict.created_at)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>{t('fieldColumn')}</span>
          <span>{t('localColumn')}</span>
          <span>{t('googleColumn')}</span>
        </div>
        <div className="divide-y divide-border">
          <DiffRow label={t('fieldTitle')} local={local?.title} remote={remote.remote_title} />
          <DiffRow
            label={t('fieldDateTime')}
            local={formatDate(local?.scheduled_at)}
            remote={formatDate(remote.remote_scheduled_at)}
          />
          <DiffRow label={t('fieldNotes')} local={local?.notes} remote={remote.remote_notes} />
        </div>
        {error && (
          <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onResolve('use_local')}
          >
            {t('keepLocalButton')}
          </Button>
          <Button size="sm" disabled={isPending} onClick={() => onResolve('use_remote')}>
            {t('useGoogleButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConflictCard({
  conflict,
  onResolved,
}: {
  conflict: Conflict;
  onResolved: (id: string) => void;
}) {
  const t = useTranslations('Calendar');
  const [isPending, startTransition] = useTransition();
  const [resolvedWith, setResolvedWith] = useState<'use_local' | 'use_remote' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = (resolution: 'use_local' | 'use_remote') => {
    setError(null);
    startTransition(async () => {
      const result = await resolveConflict(conflict.id, resolution);
      if (result.success) {
        setResolvedWith(resolution);
        onResolved(conflict.id);
      } else {
        setError(result.error ?? t('conflictResolveFailed'));
      }
    });
  };

  if (resolvedWith) {
    return (
      <Card className="opacity-60">
        <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          {resolvedWith === 'use_local' ? t('resolvedKeptLocal') : t('resolvedKeptGoogle')}
        </CardContent>
      </Card>
    );
  }

  return (
    <ConflictCardBody
      conflict={conflict}
      isPending={isPending}
      error={error}
      onResolve={handleResolve}
    />
  );
}

export function ConflictList({ conflicts }: ConflictListProps) {
  const t = useTranslations('Calendar');
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const pending = conflicts.filter((c) => !resolved.has(c.id));

  const handleResolved = (id: string) => {
    setResolved((prev) => new Set([...prev, id]));
  };

  if (conflicts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t('noConflicts')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{t('pendingCount', { count: pending.length })}</Badge>
        {resolved.size > 0 && (
          <Badge variant="secondary">{t('resolvedThisSession', { count: resolved.size })}</Badge>
        )}
      </div>
      {conflicts.map((conflict) => (
        <ConflictCard key={conflict.id} conflict={conflict} onResolved={handleResolved} />
      ))}
    </div>
  );
}
