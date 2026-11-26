'use client';

import { SongSelect } from '@/components/songs/song-picker';
import type { SongOption } from '@/lib/services/lesson-form-data';

/** The song row-card; clicking it opens the searchable song picker. */
export const QaSong = ({
  songs,
  songId,
  placeholder,
  onSongId,
}: {
  songs: SongOption[];
  songId: string;
  placeholder: string;
  onSongId: (v: string) => void;
}) => {
  const song = songs.find((s) => s.id === songId);
  return (
    <SongSelect
      id="assignment-song"
      ariaLabel={placeholder}
      songs={songs}
      value={songId}
      onChange={onSongId}
      className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-[var(--rule)] px-2.5 py-2 text-left"
    >
      <span className="grid size-6 place-items-center rounded bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-2)] font-[family-name:var(--serif)] text-[10px] font-medium text-[var(--on-accent)]">
        {song?.musicalKey ?? song?.title[0] ?? '♪'}
      </span>
      <span
        className={`truncate font-[family-name:var(--serif)] text-sm italic ${song ? 'text-[var(--ink)]' : 'text-[var(--ink-4)]'}`}
      >
        {song?.title ?? placeholder}
      </span>
      <span className="ml-auto truncate font-[family-name:var(--mono)] text-[11px] text-[var(--ink-4)]">
        {song?.author ?? ''}
      </span>
    </SongSelect>
  );
};
