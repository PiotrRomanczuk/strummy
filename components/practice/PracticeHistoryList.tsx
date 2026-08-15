'use client';

import { useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Music, Clock, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deletePracticeSession, type PracticeSessionWithSong } from '@/app/actions/practice';

interface PracticeHistoryListProps {
  sessions: PracticeSessionWithSong[];
  canUndo?: boolean;
}

function formatDate(iso: string): string {
  // Explicit locale — `undefined` follows the runtime's own locale, which differs
  // between the server render and the browser and trips React hydration.
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PracticeRow({
  session,
  allowUndo,
}: {
  session: PracticeSessionWithSong;
  allowUndo: boolean;
}) {
  const t = useTranslations('Practice');
  const tSongs = useTranslations('Songs');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleUndo = useCallback(() => {
    startTransition(async () => {
      const result = await deletePracticeSession(session.id);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t('removedToast'));
      router.refresh();
    });
  }, [session.id, router, t]);

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
          {session.song ? (
            <Link href={`/dashboard/songs/${session.song.id}`} className="truncate hover:underline">
              {session.song.title}
            </Link>
          ) : (
            <span className="truncate">{t('generalTechnique')}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t('durationUnit', { minutes: session.duration_minutes })}
          </span>
          {session.bpm_practiced != null && (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <Gauge className="h-3 w-3" />
              {tSongs('tempoBpm', { tempo: session.bpm_practiced })}
            </span>
          )}
          <span>{formatDate(session.created_at)}</span>
        </div>
        {session.notes && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{session.notes}</p>
        )}
      </div>
      {allowUndo && session.canUndo && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('removeButton')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmRemoveTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('confirmRemoveDescription')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('keepButton')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleUndo}>{t('removeButton')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </li>
  );
}

export function PracticeHistoryList({ sessions, canUndo = true }: PracticeHistoryListProps) {
  const t = useTranslations('Practice');

  if (sessions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{t('emptyHistoryState')}</p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {sessions.map((session) => (
        <PracticeRow key={session.id} session={session} allowUndo={canUndo} />
      ))}
    </ul>
  );
}
