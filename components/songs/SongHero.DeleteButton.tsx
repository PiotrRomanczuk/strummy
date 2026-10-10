'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Trash2 } from 'lucide-react';
import { songGhostButton } from './song-hero.styles';

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
import { deleteSong } from '@/app/actions/songs';

type Props = { songId: string; songTitle: string };

export const SongHeroDeleteButton = ({ songId, songTitle }: Props) => {
  const t = useTranslations('Songs');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteSong(songId);
      if (result.success) {
        setOpen(false);
        router.push('/dashboard/songs');
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {/* Mockup-style red trash ghost; the label stays as the accessible name. */}
        <button
          type="button"
          data-testid="song-delete-button"
          aria-label={t('deleteSongLink')}
          title={t('deleteSongLink')}
          style={{ ...songGhostButton, color: 'var(--danger)' }}
        >
          <Trash2 size={12} strokeWidth={1.6} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteSongConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteSongConfirmDescription', { title: songTitle })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            data-testid="delete-confirm-button"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('deleteSongLink')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
