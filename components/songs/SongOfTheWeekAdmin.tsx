'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import * as z from 'zod';
import { SetSongOfTheWeekSchema, type SetSongOfTheWeekInput } from '@/schemas/SongOfTheWeekSchema';
import { setSongOfTheWeek } from '@/app/actions/song-of-the-week';

interface Props {
  songId: string;
}

export function SongOfTheWeekAdmin({ songId }: Props) {
  const t = useTranslations('Songs');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof SetSongOfTheWeekSchema>>({
    resolver: zodResolver(SetSongOfTheWeekSchema),
    defaultValues: {
      song_id: songId,
      teacher_message: '',
      active_until: '',
    },
  });

  const onSubmit = async (data: z.input<typeof SetSongOfTheWeekSchema>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await setSongOfTheWeek(data as SetSongOfTheWeekInput);
      if ('success' in result) {
        reset();
        setOpen(false);
      } else {
        setError(result.error || 'Failed to set song of the week');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 ml-2"
      >
        <Star className="w-4 h-4" />
        {t('setSongOfTheWeek', { fallback: 'Set as Song of the Week' })}
      </Button>

      <ResponsiveDialog
        open={open}
        onOpenChange={(newOpen) => {
          if (!newOpen) {
            reset();
            setError(null);
          }
          setOpen(newOpen);
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t('setSongOfTheWeekTitle', { fallback: 'Set Song of the Week' })}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="teacher_message">
                {t('sotwTeacherMessage', { fallback: 'Teacher Message' })}
              </Label>
              <Textarea
                id="teacher_message"
                placeholder={t('sotwTeacherMessagePlaceholder', { fallback: 'Why did you choose this song? Any tips?' })}
                {...register('teacher_message')}
                rows={3}
              />
              {errors.teacher_message && <p className="text-red-500 text-xs">{errors.teacher_message?.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="active_until">
                {t('sotwActiveUntil', { fallback: 'Active Until (optional)' })}
              </Label>
              <Input
                id="active_until"
                type="date"
                {...register('active_until')}
              />
              {errors.active_until && <p className="text-red-500 text-xs">{errors.active_until?.message as string}</p>}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                {t('cancel', { fallback: 'Cancel' })}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('saving', { fallback: 'Saving...' }) : t('save', { fallback: 'Set Song' })}
              </Button>
            </div>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
