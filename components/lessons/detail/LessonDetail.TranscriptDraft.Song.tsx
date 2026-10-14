'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { acceptDraftSongAction } from '@/app/actions/transcript-draft-accept';
import { SONG_PROGRESS_STATUSES, type DraftSong } from '@/lib/ai/schemas/transcript-draft';
import type { SongCandidate, SongResolution } from '@/lib/services/transcript-draft.helpers';
import { DraftAcceptedMark } from './LessonDetail.TranscriptDraft.Sections';
import { DRAFT_BUTTON, DRAFT_SELECT } from './transcript-draft.styles';

type Props = {
  lessonId: string;
  index: number;
  song: DraftSong;
  resolution: SongResolution;
  isAccepted: boolean;
  isPending: boolean;
  run: (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => void;
};

/**
 * One mined song. Matched → status + "Dodaj do lekcji"; candidates → pick one
 * first; new → a link to the song form (never auto-created — the catalogue
 * is the teacher's, a free-tier model does not get to write to it).
 */
export function TranscriptDraftSong({
  lessonId,
  index,
  song,
  resolution,
  isAccepted,
  isPending,
  run,
}: Props) {
  const t = useTranslations('Lessons');
  const [status, setStatus] = useState<string>(song.suggested_status);
  const [songId, setSongId] = useState<string>(
    resolution.match === 'matched' ? resolution.songId : ''
  );
  const label = song.artist ? `${song.title} — ${song.artist}` : song.title;

  return (
    <li className="flex flex-col gap-2 border-t border-[var(--rule)] py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-[var(--ink)]">{label}</span>
        {song.sentiment === 'enthusiastic' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold-tint)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] uppercase tracking-[.1em] text-[var(--gold-dim)]">
            <Sparkles size={10} aria-hidden /> {t('draftEnthusiastic')}
          </span>
        )}
        {resolution.match === 'matched' && (
          <span className="font-[family-name:var(--mono)] text-[10px] text-[var(--ink-4)]">
            {resolution.title}
            {resolution.author ? ` · ${resolution.author}` : ''}
          </span>
        )}
      </div>
      {song.quotes[0] && (
        <q className="text-[12px] italic leading-[1.5] text-[var(--ink-3)]">{song.quotes[0]}</q>
      )}

      {isAccepted ? (
        <DraftAcceptedMark label={t('draftAccepted')} />
      ) : resolution.match === 'new' ? (
        <NewSongLink song={song} label={t('draftNewSong')} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {resolution.match === 'candidates' && (
            <CandidateSelect
              candidates={resolution.candidates}
              value={songId}
              onChange={setSongId}
              label={t('draftPickCandidate')}
            />
          )}
          <StatusSelect value={status} onChange={setStatus} label={t('draftStatusLabel')} />
          <button
            type="button"
            className={DRAFT_BUTTON}
            disabled={isPending || !songId}
            onClick={() => run(() => acceptDraftSongAction(lessonId, { index, songId, status }))}
          >
            {t('draftAddToLesson')}
          </button>
        </div>
      )}
    </li>
  );
}

/** No catalogue hit: hand the title to the song form, never auto-create. */
const NewSongLink = ({ song, label }: { song: DraftSong; label: string }) => {
  const params = new URLSearchParams({ title: song.title });
  if (song.artist) params.set('author', song.artist);
  return (
    <a
      href={`/dashboard/songs/new?${params.toString()}`}
      className="text-[12px] text-[var(--ink-2)] underline underline-offset-2 hover:text-[var(--ink)]"
    >
      {label}
    </a>
  );
};

const CandidateSelect = ({
  candidates,
  value,
  onChange,
  label,
}: {
  candidates: SongCandidate[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) => (
  <select
    aria-label={label}
    className={DRAFT_SELECT}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    <option value="">{label}</option>
    {candidates.map((c) => (
      <option key={c.songId} value={c.songId}>
        {c.title}
        {c.author ? ` — ${c.author}` : ''}
      </option>
    ))}
  </select>
);

const StatusSelect = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (status: string) => void;
  label: string;
}) => {
  const tSongs = useTranslations('Songs');
  return (
    <select
      aria-label={label}
      className={DRAFT_SELECT}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {SONG_PROGRESS_STATUSES.map((s) => (
        <option key={s} value={s}>
          {tSongs(`stageShort.${s}`)}
        </option>
      ))}
    </select>
  );
};
