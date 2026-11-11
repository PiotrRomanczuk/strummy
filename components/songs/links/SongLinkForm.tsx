'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { markSongWithoutRecording, saveSongYoutubeLink } from '@/app/actions/song-links';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isYoutubeVideoUrl, type NoRecordingKind } from '@/schemas/SongLinkSchema';

type Props = {
  songId: string;
  songTitle: string;
};

/** One row of the missing-links queue: paste the video link, or file the entry as having no recording. */
export function SongLinkForm({ songId, songTitle }: Props) {
  const t = useTranslations('Songs');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => ReturnType<typeof saveSongYoutubeLink>) =>
    startTransition(async () => {
      const result = await action();
      setError(result.success ? null : t(result.error ?? 'linkSaveFailed'));
    });

  const save = () => {
    const trimmed = url.trim();
    if (!isYoutubeVideoUrl(trimmed)) {
      setError(t('invalidYoutubeLink'));
      return;
    }
    run(() => saveSongYoutubeLink(songId, trimmed));
  };

  const markAs = (kind: NoRecordingKind) => run(() => markSongWithoutRecording(songId, kind));

  return (
    <form
      className="flex w-full flex-col gap-2 sm:w-[420px]"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="flex gap-2">
        <Input
          type="url"
          inputMode="url"
          value={url}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-label={t('linkInputLabel', { title: songTitle })}
          aria-invalid={Boolean(error)}
          disabled={isPending}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          onBlur={() => {
            if (url.trim() && !isYoutubeVideoUrl(url.trim())) setError(t('invalidYoutubeLink'));
          }}
        />
        <Button type="submit" disabled={isPending || !url.trim()}>
          {isPending ? t('linkSaving') : t('linkSave')}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--ink-3)]">
        <span>{t('linkNoRecording')}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => markAs('exercise')}
        >
          {t('linkMarkExercise')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => markAs('other')}
        >
          {t('linkMarkOther')}
        </Button>
      </div>
    </form>
  );
}
