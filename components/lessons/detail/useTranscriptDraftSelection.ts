'use client';

import { useMemo, useState } from 'react';

import type { ResolvedLessonDraft } from '@/lib/ai/schemas/lesson-transcript-draft';
import { defaultSelection, defaultSong, SKILL_MIN_CONFIDENCE } from '@/lib/services/lesson-transcript-draft-selection';
import type { ApplySong, LessonDraftApply } from '@/schemas/LessonDraftApplySchema';

export type SongRow = { key: string; heard: string; include: boolean; value: ApplySong; isNew: boolean };
export type SkillRow = { key: string; name: string; include: boolean; value: LessonDraftApply['skills'][number] };

/** A song the defaults left out, made selectable anyway (catalog match or a new draft song). */
function selectableSong(song: ResolvedLessonDraft['songs'][number]): ApplySong {
  const status = song.role === 'homework' ? 'to_learn' : (song.status ?? 'started');
  const notes = song.notes.join('\n');
  return song.match.songId
    ? { songId: song.match.songId, newSong: null, status, notes }
    : { songId: null, newSong: { title: song.heardTitle, author: song.heardArtist }, status, notes };
}

function initialRows(draft: ResolvedLessonDraft) {
  const songs: SongRow[] = draft.songs.map((song, i) => {
    const preset = defaultSong(song);
    const value = preset ?? selectableSong(song);
    return { key: `song-${i}`, heard: song.match.title ?? song.heardTitle, include: preset !== null, value, isNew: value.songId === null };
  });
  const skills: SkillRow[] = draft.skills
    .filter((s) => s.skillId)
    .map((s, i) => ({
      key: `skill-${i}`,
      name: s.skillName,
      include: s.confidence >= SKILL_MIN_CONFIDENCE,
      value: { skillId: s.skillId as string, status: s.status, note: s.note },
    }));
  return { songs, skills };
}

/**
 * Card state for "Szkic z nagrania": starts from the conservative default
 * selection, lets the teacher tick/untick and edit, and folds it back into
 * one LessonDraftApply for the apply action.
 */
export function useTranscriptDraftSelection(draft: ResolvedLessonDraft, today: string) {
  const defaults = useMemo(() => defaultSelection(draft, today), [draft, today]);
  const [rows, setRows] = useState(() => initialRows(draft));
  const [notes, setNotes] = useState(defaults.notes);
  const [lessonTitle, setLessonTitle] = useState(defaults.lessonTitle ?? '');
  const [assignment, setAssignment] = useState(defaults.assignment ?? null);
  const [includeAssignment, setIncludeAssignment] = useState(defaults.assignment !== null);
  const [markCompleted, setMarkCompleted] = useState(false);

  const updateSong = (key: string, patch: Partial<SongRow>) =>
    setRows((r) => ({ ...r, songs: r.songs.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));
  const updateSkill = (key: string, patch: Partial<SkillRow>) =>
    setRows((r) => ({ ...r, skills: r.skills.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));

  const selection: LessonDraftApply = {
    lessonTitle: lessonTitle.trim() || null,
    notes,
    markCompleted,
    songs: rows.songs.filter((s) => s.include).map((s) => s.value),
    assignment: includeAssignment ? assignment : null,
    skills: rows.skills.filter((s) => s.include).map((s) => s.value),
  };

  return {
    rows,
    updateSong,
    updateSkill,
    notes,
    setNotes,
    lessonTitle,
    setLessonTitle,
    assignment,
    setAssignment,
    includeAssignment,
    setIncludeAssignment,
    markCompleted,
    setMarkCompleted,
    selection,
  };
}
