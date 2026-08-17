'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import * as z from 'zod';
import { SongRequestFormSchema, type SongRequestFormData } from '@/schemas/SongRequestSchema';
import { submitSongRequest } from '@/app/actions/song-requests';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SongRequestModal({ open, onOpenChange }: Props) {
  const t = useTranslations('Songs');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof SongRequestFormSchema>>({
    resolver: zodResolver(SongRequestFormSchema),
    defaultValues: {
      title: '',
      artist: '',
      url: '',
      notes: '',
    },
  });

  const onSubmit = async (data: z.input<typeof SongRequestFormSchema>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitSongRequest(data as SongRequestFormData);
      if (result.success) {
        reset();
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to submit request');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          reset();
          setError(null);
        }
        onOpenChange(newOpen);
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t('requestSongTitle')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="title">
              {t('requestSongTitleField')} *
            </Label>
            <Input
              id="title"
              placeholder={t('requestSongTitlePlaceholder')}
              {...register('title')}
            />
            {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist">{t('requestSongArtistField')}</Label>
            <Input
              id="artist"
              placeholder={t('requestSongArtistPlaceholder')}
              {...register('artist')}
            />
            {errors.artist && <p className="text-red-500 text-xs">{errors.artist.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">
              {t('requestSongUrlField')}
            </Label>
            <Input id="url" placeholder="https://..." {...register('url')} />
            {errors.url && <p className="text-red-500 text-xs">{errors.url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              {t('requestSongNotesField')}
            </Label>
            <Textarea
              id="notes"
              placeholder={t('requestSongNotesPlaceholder')}
              {...register('notes')}
              rows={3}
            />
            {errors.notes && <p className="text-red-500 text-xs">{errors.notes.message}</p>}
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('submitting')
                : t('submit')}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
