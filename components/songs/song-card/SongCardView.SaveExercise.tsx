'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { SaveExerciseForm } from './SongCardView.SaveExercise.Form';
import { groupClass as group, optionClass as option } from './SongCardView.Tempo';
import type { CardSource } from './song-card-link.helpers';
import { useSaveExercise } from './useSaveExercise';

type Props = {
  songId: string;
  videoId: string | null;
  /** The selected part's song2logic number; null when the card has no part selected (the button is off). */
  partN: number | null;
  /** "<part name> – <song title>" */
  defaultName: string;
  rate: number;
  source: CardSource;
};

/** "Save as exercise" next to the practice link: the part the card is on, at its tempo, under a name. */
export const SongCardSaveExercise = ({ partN, ...settings }: Props) => {
  const t = useTranslations('SongCard');
  const [isOpen, setIsOpen] = useState(false);
  const form = useSaveExercise({ ...settings, partN: partN ?? 1 });
  const percent = Math.round(settings.rate * 100);
  const isSaved = form.status === 'saved';
  const isBusy = form.status === 'saving';

  const open = (next: boolean) => {
    if (next) form.reset();
    setIsOpen(next);
  };

  return (
    <>
      <button
        type="button"
        disabled={partN === null}
        onClick={() => open(true)}
        className={`${group} ${option(false)}`}
      >
        {t('saveExercise')}
      </button>
      <Dialog open={isOpen} onOpenChange={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exerciseTitle')}</DialogTitle>
            <DialogDescription>
              {t('exerciseHint', { part: partN ?? 0, tempo: percent })}
            </DialogDescription>
          </DialogHeader>
          <SaveExerciseForm form={form} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => open(false)}>
              {t(isSaved ? 'exerciseClose' : 'exerciseCancel')}
            </Button>
            {!isSaved && (
              <Button type="button" disabled={isBusy || !form.name.trim()} onClick={form.submit}>
                {t(isBusy ? 'exerciseSaving' : 'exerciseSave')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
