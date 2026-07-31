'use client';

import { formStyles as s } from '@/components/shared/form-styles';
import { SongPicker } from '@/components/songs/SongPicker';
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
}: Props) => (
  <>
    <div style={s.field}>
      <label style={s.label} htmlFor="lesson-songs">
        Repertoire
      </label>
      <SongPicker
        songs={songs}
        selectedIds={songIds}
        onChange={onSongIds}
        inputId="lesson-songs"
        emptyLibraryHint="No songs in the library yet — add one from Songs first."
      />
    </div>

    <div style={{ ...s.field, marginBottom: 0 }}>
      <label style={s.label} htmlFor="lesson-notes">
        Notes
      </label>
      <textarea
        id="lesson-notes"
        style={s.textarea}
        value={notes}
        placeholder="What did you cover, what to practise…"
        onChange={(e) => onNotes(e.target.value)}
      />
    </div>
  </>
);
