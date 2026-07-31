'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';
import { SongPicker } from '@/components/songs/song-picker';
import type { SongOption } from '@/lib/services/lesson-form-data';

type Props = {
  songs: SongOption[];
  songIds: string[];
  notes: string;
  onSongIds: (v: string[]) => void;
  onNotes: (v: string) => void;
};

/** Section III — repertoire (searchable multi-select) + lesson notes. */
export const LessonFormFieldsSongsNotes = ({
  songs,
  songIds,
  notes,
  onSongIds,
  onNotes,
}: Props) => {
  const t = useTranslations('Lessons');
  return (
    <>
      <div style={s.field}>
        <label style={s.label} htmlFor="lesson-songs">
          {t('repertoireEyebrow')}
        </label>
        <SongPicker
          songs={songs}
          selectedIds={songIds}
          onChange={onSongIds}
          inputId="lesson-songs"
          emptyLibraryHint={t('emptyLibraryHint')}
        />
      </div>

      <div style={{ ...s.field, marginBottom: 0 }}>
        <label style={s.label} htmlFor="lesson-notes">
          {t('notesTitle')}
        </label>
        <textarea
          id="lesson-notes"
          style={s.textarea}
          value={notes}
          placeholder={t('notesPlaceholder')}
          onChange={(e) => onNotes(e.target.value)}
        />
      </div>
    </>
  );
};
