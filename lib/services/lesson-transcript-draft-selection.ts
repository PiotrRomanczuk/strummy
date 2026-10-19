import type { ResolvedLessonDraft } from '@/lib/ai/schemas/lesson-transcript-draft';
import type { ApplySong, LessonDraftApply } from '@/schemas/LessonDraftApplySchema';

/**
 * Turns a stored draft into the default approval (CNT-8): what the card shows
 * pre-ticked, and what `apply` writes when an API caller sends no body.
 * Conservative on purpose — mentions, low-confidence guesses and songs that
 * matched nothing need a human click.
 */

export const SONG_MIN_CONFIDENCE = 0.5;
export const NEW_SONG_MIN_CONFIDENCE = 0.7;
export const ASSIGNMENT_MIN_CONFIDENCE = 0.7;
export const SKILL_MIN_CONFIDENCE = 0.6;

const STATUS_LABEL_PL: Record<ApplySong['status'], string> = {
  to_learn: 'do nauki',
  started: 'rozpoczęta',
  slow_tempo: 'wolne tempo',
  remembered: 'z pamięci',
  with_author: 'z nagraniem',
  mastered: 'opanowana',
};

type DraftSong = ResolvedLessonDraft['songs'][number];

const songStatus = (song: DraftSong): ApplySong['status'] =>
  song.role === 'homework' ? 'to_learn' : (song.status ?? 'started');

export function defaultSong(song: DraftSong): ApplySong | null {
  if (song.role === 'mentioned' || song.confidence < SONG_MIN_CONFIDENCE) return null;
  const notes = song.notes.join('\n');
  if (song.match.songId) return { songId: song.match.songId, newSong: null, status: songStatus(song), notes };
  if (song.confidence < NEW_SONG_MIN_CONFIDENCE || song.role === 'reviewed') return null;
  return { songId: null, newSong: { title: song.heardTitle, author: song.heardArtist }, status: songStatus(song), notes };
}

const section = (title: string, items: string[]) =>
  items.length ? [`## ${title}`, ...items.map((i) => `- ${i}`), ''] : [];

function songSection(draft: ResolvedLessonDraft): string[] {
  const songs = draft.songs.filter((s) => s.role !== 'mentioned');
  if (!songs.length) return [];
  return [
    '## Piosenki',
    ...songs.flatMap((s) => [
      `### ${s.match.title ?? s.heardTitle}${(s.match.author ?? s.heardArtist) ? ` (${s.match.author ?? s.heardArtist})` : ''} — ${STATUS_LABEL_PL[songStatus(s)]}`,
      ...(s.sections.length ? [`- Zakres: ${s.sections.join(', ')}`] : []),
      ...s.notes.map((n) => `- ${n}`),
      '',
    ]),
  ];
}

/** Lesson notes in the blueprint's fixed structure; empty sections are left out. */
export function composeLessonNotes(draft: ResolvedLessonDraft, today: string): string {
  const assessment = [
    ...draft.notes.wentWell.map((n) => `Dobrze: ${n}`),
    ...draft.notes.needsWork.map((n) => `Do pracy: ${n}`),
  ];
  const lines = [
    ...songSection(draft),
    ...section('Technika', draft.notes.technique),
    ...section('Teoria', draft.notes.theory),
    ...section('Ocena', assessment),
    ...section('Inne', draft.notes.other),
  ];
  if (!lines.length) return '';
  return [...lines, `_Źródło: nagranie lekcji, szkic zatwierdzony ${today}_`].join('\n');
}

export function defaultSelection(draft: ResolvedLessonDraft, today: string): LessonDraftApply {
  const songs = draft.songs.map(defaultSong).filter((s): s is ApplySong => s !== null);
  const homework = draft.assignment;
  const homeworkSong = homework
    ? draft.songs.find((s) => homework.songTitles.includes(s.heardTitle) && s.match.songId)
    : undefined;

  return {
    lessonTitle: draft.lessonTitle,
    notes: composeLessonNotes(draft, today),
    markCompleted: false,
    songs,
    assignment:
      homework && (homework.isExplicit || homework.confidence >= ASSIGNMENT_MIN_CONFIDENCE)
        ? {
            title: homework.title,
            description: homework.description,
            checklist: homework.checklist,
            songId: homeworkSong?.match.songId ?? null,
            dueDate: null,
            dailyTargetMinutes: homework.dailyTargetMinutes,
            submissionType: homework.submissionType,
          }
        : null,
    skills: draft.skills
      .filter((s) => s.skillId && s.confidence >= SKILL_MIN_CONFIDENCE)
      .map((s) => ({ skillId: s.skillId as string, status: s.status, note: s.note })),
  };
}
