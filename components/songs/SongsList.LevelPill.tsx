/** Claude Design `LevelPill`: a colour dot carries the difficulty, the label stays quiet. */
const LEVEL_DOT: Record<string, string> = {
  starter: 'bg-[var(--success)]',
  beginner: 'bg-[var(--success)]',
  intermediate: 'bg-[var(--gold-2)]',
  advanced: 'bg-[var(--danger)]',
};

export const SongLevelPill = ({ level, label }: { level: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--ink-3)]">
    <span
      aria-hidden="true"
      className={`size-[7px] flex-none rounded-full ${LEVEL_DOT[level] ?? 'bg-[var(--ink-5)]'}`}
    />
    {label}
  </span>
);
